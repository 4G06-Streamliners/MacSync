import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from '../users/authorization.service';
import { EventsService } from './events.service';
import type { NewEvent } from '../db/schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StaffGuard } from '../auth/staff.guard';
import type { FastifyReply } from 'fastify';
import { VenueReportPdfService } from './venue-report-pdf.service';
import { DatabaseService } from '../database/database.service';
import { eq } from 'drizzle-orm';
import {
  events as eventsTable,
  roles as rolesTable,
  userRoles as userRolesTable,
  users as usersTable,
} from '../db/schema';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly authorizationService: AuthorizationService,
    private readonly venueReportPdfService: VenueReportPdfService,
    private readonly dbService: DatabaseService,
  ) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('user/:userId/tickets')
  async getUserTickets(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    const currentUserId = req.user.sub;
    if (currentUserId === +userId) {
      return this.eventsService.getTicketsForUser(+userId);
    }
    const access = await this.authorizationService.getStaffAccess(currentUserId);
    const isStaff =
      access.isGlobalAdmin || access.managedEventIds.length > 0;
    if (!isStaff) {
      throw new ForbiddenException('Access denied.');
    }
    return this.eventsService.getTicketsForUserScoped(+userId, access);
  }

  @Get(':id/attendees')
  @UseGuards(StaffGuard)
  async getEventAttendees(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.authorizationService.assertCanManageEvent(req.user.sub, +id);
    return this.eventsService.getAttendeesForEvent(+id);
  }

  @Get(':id/venue-report')
  @UseGuards(StaffGuard)
  async getVenueReport(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    await this.authorizationService.assertCanManageEvent(req.user.sub, +id);
    const buf = await this.venueReportPdfService.generateBuffer(
      +id,
      req.user.sub,
    );
    const filename = `macsync-venue-order-${id}.pdf`;
    return reply
      .type('application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buf);
  }

  @Post('check-in')
  @UseGuards(StaffGuard)
  checkIn(
    @Body('qrCodeData') qrCodeData: string,
    @Req() req: RequestWithUser,
  ) {
    return this.eventsService.checkInTicket(qrCodeData ?? '', req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    const uid = userId != null && userId !== '' ? +userId : undefined;
    return this.eventsService.findOne(+id, uid);
  }

  @Post()
  @UseGuards(StaffGuard)
  async create(@Body() event: NewEvent, @Req() req: RequestWithUser) {
    const access = await this.authorizationService.getStaffAccess(req.user.sub);

    // Team admins may create events, but the managing role is forced to one of
    // their own team roles so they cannot assign another team's scope.
    if (!access.isGlobalAdmin) {
      const roleRows = await this.dbService.db
        .select({ roleId: rolesTable.id, roleName: rolesTable.name })
        .from(userRolesTable)
        .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
        .where(eq(userRolesTable.userId, req.user.sub));

      const teamRoles = roleRows.filter(
        (r) => r.roleName !== 'Admin' && r.roleName !== 'Member',
      );

      if (teamRoles.length === 0) {
        throw new ForbiddenException('Only staff admins can create events.');
      }

      return this.eventsService.create({
        ...event,
        createdBy: req.user.sub,
        managingRoleId: teamRoles[0].roleId,
      });
    }

    return this.eventsService.create({ ...event, createdBy: req.user.sub });
  }

  @Put(':id')
  @UseGuards(StaffGuard)
  async update(
    @Param('id') id: string,
    @Body() event: Partial<NewEvent>,
    @Req() req: RequestWithUser,
  ) {
    await this.authorizationService.assertCanManageEvent(req.user.sub, +id);
    // Edit policy: only name/date/description are mutable via generic update.
    const allowedKeys = new Set(['name', 'date', 'description']);
    const providedKeys = Object.keys(event ?? {});
    const disallowed = providedKeys.filter((k) => !allowedKeys.has(k));
    if (disallowed.length > 0) {
      throw new ForbiddenException(
        `Only name, date, and description can be edited. Blocked fields: ${disallowed.join(', ')}`,
      );
    }

    const updatePayload: Partial<NewEvent> = {
      name: event.name,
      date: event.date,
      description: event.description,
    };
    return this.eventsService.update(+id, updatePayload);
  }

  @Delete(':id')
  @UseGuards(StaffGuard)
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.authorizationService.assertCanManageEvent(req.user.sub, +id);
    return this.eventsService.delete(+id, req.user.sub);
  }

  /** Global admins only: assign which users may administer this event. */
  @Patch(':id/admins')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async setEventAdmins(
    @Param('id') id: string,
    @Body() body: { userIds?: number[] },
  ) {
    await this.authorizationService.setEventAdminsForEvent(
      +id,
      Array.isArray(body.userIds) ? body.userIds : [],
    );
    return { ok: true };
  }

  // Super admin: assigns which *role* manages this event (Option A).
  @Patch(':id/managing-role')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async setEventManagingRole(
    @Param('id') id: string,
    @Body() body: { roleName?: string | null },
    @Req() req: RequestWithUser,
  ) {
    const me = await this.dbService.db
      .select({ isSystemAdmin: usersTable.isSystemAdmin })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.sub))
      .limit(1);

    if (!me[0]?.isSystemAdmin) {
      throw new ForbiddenException('Only super admins can modify event admin roles.');
    }

    const roleName = body.roleName ?? null;
    if (roleName !== null) {
      const roleRow = await this.dbService.db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.name, roleName))
        .limit(1);

      if (!roleRow[0]) {
        throw new ForbiddenException(`Role not found: ${roleName}`);
      }

      await this.dbService.db
        .update(eventsTable)
        .set({ managingRoleId: roleRow[0].id, updatedAt: new Date() })
        .where(eq(eventsTable.id, +id));
    } else {
      await this.dbService.db
        .update(eventsTable)
        .set({ managingRoleId: null, updatedAt: new Date() })
        .where(eq(eventsTable.id, +id));
    }

    return { ok: true };
  }

  @Post(':id/signup')
  async signup(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body('selectedTable') selectedTable?: number,
  ) {
    try {
      return await this.eventsService.signup(+id, req.user.sub, selectedTable);
    } catch (err) {
      console.error('[signup] Error:', err);
      if (err instanceof Error) {
        console.error('[signup] Stack:', err.stack);
      }
      throw err;
    }
  }

  @Post(':id/checkout-session')
  createCheckoutSession(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body()
    body: {
      successUrl?: string;
      cancelUrl?: string;
      selectedTable?: number;
    },
  ) {
    const isValidRedirectUrl = (s: string) =>
      typeof s === 'string' &&
      s.length > 0 &&
      (s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('exp://') ||
        s.startsWith('expo://'));
    const successUrl =
      (body.successUrl?.trim() && isValidRedirectUrl(body.successUrl.trim())
        ? body.successUrl.trim()
        : null) ||
      process.env.STRIPE_SUCCESS_URL ||
      'http://localhost:8081/payment-success';
    const cancelUrl =
      (body.cancelUrl?.trim() && isValidRedirectUrl(body.cancelUrl.trim())
        ? body.cancelUrl.trim()
        : null) ||
      process.env.STRIPE_CANCEL_URL ||
      'http://localhost:8081/payment-cancel';
    return this.eventsService.createCheckoutSession(
      +id,
      req.user.sub,
      successUrl,
      cancelUrl,
      body.selectedTable,
    );
  }

  @Post('checkout-session/:sessionId/release')
  async releaseCheckoutReservation(@Param('sessionId') sessionId: string) {
    console.log(
      '[releaseCheckoutReservation] Releasing reservation for session:',
      sessionId,
    );
    await this.eventsService.releaseReservation(sessionId);
    console.log('[releaseCheckoutReservation] Released successfully');
    return { released: true };
  }

  @Post(':id/cancel')
  cancelSignup(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.eventsService.cancelSignup(+id, req.user.sub);
  }
}
