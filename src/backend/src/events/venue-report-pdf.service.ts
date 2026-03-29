import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { EventsService } from './events.service';
import { UsersService } from '../users/users.service';
import type { VenueReportPdfPayload } from './venue-report-pdf.types';

@Injectable()
export class VenueReportPdfService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  async generateBuffer(eventId: number, preparedByUserId: number): Promise<Buffer> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const attendees = await this.eventsService.getAttendeesForEvent(eventId);
    const issuer = await this.usersService.findOne(preparedByUserId);
    const preparedBy =
      (issuer?.name && String(issuer.name).trim()) ||
      issuer?.email ||
      'Admin';

    const evDate =
      event.date instanceof Date ? event.date : new Date(event.date as string);

    const issued = new Date();
    const invoiceNo = `MSU-${issued.getFullYear()}-${String(eventId).padStart(4, '0')}`;

    const payload: VenueReportPdfPayload = {
      meta: {
        invoiceNo,
        issuedDateDisplay: issued.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        preparedBy,
        status: 'CONFIRMED',
      },
      brand: {
        org: 'McMaster Student Union',
        tagline: 'MacSync Event Management Platform | macsync.ca',
        url: 'macsync.ca',
      },
      event: {
        name: event.name,
        description: event.description ?? '',
        dateDisplay: evDate.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        location: event.location ?? '',
        priceCents: event.price,
        capacity: event.capacity,
        registeredCount: event.registeredCount,
        requiresTableSignup: !!event.requiresTableSignup,
        requiresBusSignup: !!event.requiresBusSignup,
        tableCount: event.tableCount,
        seatsPerTable: event.seatsPerTable,
        busCount: event.busCount,
        busCapacity: event.busCapacity,
      },
      attendees: attendees.map((a) => ({
        name: a.name,
        email: a.email,
        program: a.program,
        tableSeat: a.tableSeat,
        busSeat: a.busSeat,
        registeredAt: a.registeredAt,
      })),
    };

    return this.runPythonPdf(payload);
  }

  private runPythonPdf(payload: VenueReportPdfPayload): Promise<Buffer> {
    const scriptPath = join(process.cwd(), 'scripts', 'venue_order_pdf.py');

    return new Promise((resolve, reject) => {
      const child = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const stderrChunks: Buffer[] = [];
      const stdoutChunks: Buffer[] = [];

      child.stdout?.on('data', (c: Buffer) => stdoutChunks.push(c));
      child.stderr?.on('data', (c: Buffer) => stderrChunks.push(c));

      child.on('error', (err) => {
        reject(
          new InternalServerErrorException(
            `Venue PDF: failed to start Python (${err.message}). Ensure Python 3 and ReportLab are installed.`,
          ),
        );
      });

      child.on('close', (code) => {
        if (code !== 0) {
          const errText = Buffer.concat(stderrChunks).toString('utf8').trim();
          const hint =
            /ModuleNotFoundError|No module named ['"]reportlab/i.test(errText)
              ? ' Install Python deps: from src/backend run `npm run setup:pdf`.'
              : '';
          reject(
            new InternalServerErrorException(
              `Venue PDF script exited with ${code}${errText ? `: ${errText}` : ''}${hint}`,
            ),
          );
          return;
        }
        resolve(Buffer.concat(stdoutChunks));
      });

      const json = JSON.stringify(payload);
      child.stdin?.write(json, 'utf8', (e) => {
        if (e) {
          reject(
            new InternalServerErrorException(
              `Venue PDF: failed to write to Python stdin: ${e.message}`,
            ),
          );
          return;
        }
        child.stdin?.end();
      });
    });
  }
}
