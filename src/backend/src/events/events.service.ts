import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  events,
  tickets,
  tableSeats,
  busSeats,
  seatReservations,
  refundRequests,
  users,
} from '../db/schema';
import type { NewEvent } from '../db/schema';
import { eq, sql, and, asc } from 'drizzle-orm';
import type { SeedDb } from '../db/seed-data';
import {
  createTableSeatsForEvent,
  createBusSeatsForEvent,
  ensureTableSeatsForEvent,
  ensureBusSeatsForEvent,
} from '../db/seed-data';

@Injectable()
export class EventsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate secure QR code data for a ticket
   */
  private generateQRCodeData(
    ticketId: number,
    userId: number,
    eventId: number,
  ): string {
    const data = `${ticketId}:${userId}:${eventId}`;
    const secret =
      process.env.QR_SECRET || 'default-secret-change-in-production';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    return `${data}:${signature}`;
  }

  /**
   * Verify QR code signature and return parsed data or null if invalid
   */
  private verifyQRCodeData(qrCodeData: string): {
    ticketId: number;
    userId: number;
    eventId: number;
  } | null {
    const parts = qrCodeData.split(':');
    if (parts.length !== 4) return null;
    const [ticketIdStr, userIdStr, eventIdStr, signature] = parts;
    const ticketId = parseInt(ticketIdStr, 10);
    const userId = parseInt(userIdStr, 10);
    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(ticketId) || isNaN(userId) || isNaN(eventId)) return null;
    const data = `${ticketId}:${userId}:${eventId}`;
    const secret =
      process.env.QR_SECRET || 'default-secret-change-in-production';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    if (expectedSig !== signature) return null;
    return { ticketId, userId, eventId };
  }

  /**
   * Check in a ticket by scanning its QR code. Admin only.
   * Returns ticket details on success, or error info.
   */
  async checkInTicket(qrCodeData: string): Promise<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    ticket?: {
      ticketId: number;
      eventName: string;
      eventDate: string;
      userName: string;
      userEmail: string;
      busSeat: string | null;
      tableSeat: string | null;
    };
    error?: string;
  }> {
    if (!qrCodeData || typeof qrCodeData !== 'string') {
      return { success: false, error: 'Invalid QR code data' };
    }
    const trimmed = qrCodeData.trim();
    const parsed = this.verifyQRCodeData(trimmed);
    if (!parsed) {
      return { success: false, error: 'Invalid or tampered QR code' };
    }
    const { ticketId } = parsed;

    const ticketRows = await this.dbService.db
      .select({
        ticketId: tickets.id,
        checkedIn: tickets.checkedIn,
        busSeat: tickets.busSeat,
        tableSeat: tickets.tableSeat,
        eventName: events.name,
        eventDate: events.date,
        userName: users.name,
        userEmail: users.email,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(eq(tickets.id, ticketId));

    const row = ticketRows[0];
    if (!row) {
      return { success: false, error: 'Ticket not found' };
    }
    if (row.checkedIn) {
      return {
        success: false,
        alreadyCheckedIn: true,
        ticket: {
          ticketId: row.ticketId,
          eventName: row.eventName,
          eventDate: String(row.eventDate),
          userName: row.userName,
          userEmail: row.userEmail,
          busSeat: row.busSeat,
          tableSeat: row.tableSeat,
        },
        error: 'Already checked in',
      };
    }

    await this.dbService.db
      .update(tickets)
      .set({ checkedIn: true, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));

    return {
      success: true,
      ticket: {
        ticketId: row.ticketId,
        eventName: row.eventName,
        eventDate: String(row.eventDate),
        userName: row.userName,
        userEmail: row.userEmail,
        busSeat: row.busSeat,
        tableSeat: row.tableSeat,
      },
    };
  }

  async findAll() {
    const rows = await this.dbService.db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        date: events.date,
        location: events.location,
        capacity: events.capacity,
        imageUrl: events.imageUrl,
        price: events.price,
        stripePriceId: events.stripePriceId,
        requiresTableSignup: events.requiresTableSignup,
        requiresBusSignup: events.requiresBusSignup,
        tableCount: events.tableCount,
        seatsPerTable: events.seatsPerTable,
        busCount: events.busCount,
        busCapacity: events.busCapacity,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        registeredCount: sql<number>`(SELECT COUNT(*)::int FROM tickets WHERE tickets.event_id = events.id)`,
      })
      .from(events)
      .orderBy(events.date);

    return rows;
  }

  async findOne(id: number, userId?: number) {
    const rows = await this.dbService.db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        date: events.date,
        location: events.location,
        capacity: events.capacity,
        imageUrl: events.imageUrl,
        price: events.price,
        stripePriceId: events.stripePriceId,
        requiresTableSignup: events.requiresTableSignup,
        requiresBusSignup: events.requiresBusSignup,
        tableCount: events.tableCount,
        seatsPerTable: events.seatsPerTable,
        busCount: events.busCount,
        busCapacity: events.busCapacity,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        registeredCount: sql<number>`(SELECT COUNT(*)::int FROM tickets WHERE tickets.event_id = events.id)`,
      })
      .from(events)
      .where(eq(events.id, id));

    const row = rows[0] ?? null;
    if (!row) return null;

    let userTicket: {
      tableSeat: string | null;
      busSeat: string | null;
    } | null = null;
    if (userId != null) {
      const ticketRows = await this.dbService.db
        .select({
          tableSeat: tickets.tableSeat,
          busSeat: tickets.busSeat,
        })
        .from(tickets)
        .where(and(eq(tickets.eventId, id), eq(tickets.userId, userId)))
        .limit(1);
      if (ticketRows[0]) {
        userTicket = {
          tableSeat: ticketRows[0].tableSeat ?? null,
          busSeat: ticketRows[0].busSeat ?? null,
        };
      }
    }

    return { ...row, userTicket };
  }

  async create(event: NewEvent) {
    if (
      !event.location ||
      typeof event.location !== 'string' ||
      !event.location.trim()
    ) {
      throw new BadRequestException('Location is required');
    }
    // Ensure date is a Date object (JSON sends it as a string)
    const values = {
      ...event,
      location: event.location.trim(),
      date: new Date(event.date as string | Date),
    };

    const result = await this.dbService.db
      .insert(events)
      .values(values)
      .returning();
    const created = result[0];

    // For paid events, create Stripe Product and Price
    if (created.price > 0) {
      const { priceId, error } = await this.paymentsService.createProductAndPrice(
        created.name,
        created.id,
        created.price,
      );

      if (error) {
        console.error('Failed to create Stripe product/price:', error);
        // Don't fail the event creation, just log the error
        // The event can still be created, but payments won't work until price is set
      } else if (priceId) {
        // Update the event with the Stripe price ID
        const updateResult = await this.dbService.db
          .update(events)
          .set({ stripePriceId: priceId, updatedAt: new Date() })
          .where(eq(events.id, created.id))
          .returning();
        // Return the updated event with stripePriceId
        if (updateResult[0]) {
          Object.assign(created, { stripePriceId: priceId });
        }
      }
    }

    // Auto-create table seats if needed
    if (
      created.requiresTableSignup &&
      created.tableCount &&
      created.seatsPerTable
    ) {
      await createTableSeatsForEvent(
        this.dbService.db as SeedDb,
        created.id,
        created.tableCount,
        created.seatsPerTable,
      );
    }

    // Auto-create bus seats if needed
    if (created.requiresBusSignup && created.busCount && created.busCapacity) {
      await createBusSeatsForEvent(
        this.dbService.db as SeedDb,
        created.id,
        created.busCount,
        created.busCapacity,
      );
    }

    return created;
  }

  async update(id: number, event: Partial<NewEvent>) {
    if ('location' in event && event.location !== undefined) {
      if (typeof event.location !== 'string' || !event.location.trim()) {
        throw new BadRequestException('Location is required');
      }
      event = { ...event, location: event.location.trim() };
    }
    // If price is being updated and the new price is > 0, create/update Stripe product/price
    if (event.price !== undefined && event.price > 0) {
      // Get the event name (either from update payload or existing event)
      const existingEventRows = await this.dbService.db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);
      const existingEvent = existingEventRows[0];
      
      if (existingEvent) {
        const eventName = event.name || existingEvent.name;
        
        const { priceId, error } = await this.paymentsService.createProductAndPrice(
          eventName,
          id,
          event.price,
        );

        if (error) {
          console.error('Failed to create Stripe product/price:', error);
          // Continue with update, but log the error
        } else if (priceId) {
          // Include the stripe price ID in the update
          event.stripePriceId = priceId;
        }
      }
    }

    const values: Record<string, unknown> = { ...event, updatedAt: new Date() };
    if (values.date != null) {
      values.date = new Date(values.date as string | Date);
    }

    const result = await this.dbService.db
      .update(events)
      .set(values)
      .where(eq(events.id, id))
      .returning();
    const updated = result[0];

    // When capacity / table / bus dimensions change, add any missing seat rows so signups match the new config.
    if (updated) {
      if (
        updated.requiresTableSignup &&
        updated.tableCount &&
        updated.seatsPerTable
      ) {
        await ensureTableSeatsForEvent(
          this.dbService.db as SeedDb,
          updated.id,
          updated.tableCount,
          updated.seatsPerTable,
        );
      }
      if (
        updated.requiresBusSignup &&
        updated.busCount &&
        updated.busCapacity
      ) {
        await ensureBusSeatsForEvent(
          this.dbService.db as SeedDb,
          updated.id,
          updated.busCount,
          updated.busCapacity,
        );
      }
    }

    return updated;
  }

  async delete(id: number) {
    const removed = await this.dbService.db
      .delete(events)
      .where(eq(events.id, id))
      .returning({ id: events.id });
    if (removed.length === 0) {
      throw new NotFoundException('Event not found');
    }
    return { deleted: true };
  }

  async signup(eventId: number, userId: number, selectedTable?: number) {
    return this.signupInternal(eventId, userId, selectedTable);
  }

  async cancelSignup(eventId: number, userId: number) {
    const existing = await this.dbService.db
      .select()
      .from(tickets)
      .where(
        sql`${tickets.eventId} = ${eventId} AND ${tickets.userId} = ${userId}`,
      );

    if (existing.length === 0) {
      return { error: 'Not signed up for this event' };
    }

    const eventCheck = await this.dbService.db
      .select({ date: events.date })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (
      eventCheck[0] &&
      new Date(eventCheck[0].date).getTime() < Date.now()
    ) {
      return {
        error: 'This event has already ended. Cancellation is not available.',
      };
    }

    const ticket = existing[0];

    // Free bus seat
    await this.dbService.db
      .update(busSeats)
      .set({ ticketId: null, updatedAt: new Date() })
      .where(eq(busSeats.ticketId, ticket.id));

    // Free table seat
    await this.dbService.db
      .update(tableSeats)
      .set({ ticketId: null, updatedAt: new Date() })
      .where(eq(tableSeats.ticketId, ticket.id));

    // Delete ticket
    await this.dbService.db.delete(tickets).where(eq(tickets.id, ticket.id));

    // Get event name for notification
    const eventRows = await this.dbService.db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const eventName = eventRows[0]?.name ?? 'the event';
    await this.notificationsService.createNotification(
      userId,
      'cancellation',
      `Your registration for ${eventName} has been cancelled.`,
      eventId,
    );

    return { cancelled: true };
  }

  /** Admin: everyone registered for an event with seat and contact details. */
  async getAttendeesForEvent(eventId: number) {
    const rows = await this.dbService.db
      .select({
        ticketId: tickets.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        program: users.program,
        checkedIn: tickets.checkedIn,
        tableSeat: tickets.tableSeat,
        busSeat: tickets.busSeat,
        registeredAt: tickets.createdAt,
        refundRequestId: refundRequests.id,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .leftJoin(
        refundRequests,
        and(
          eq(refundRequests.ticketId, tickets.id),
          eq(refundRequests.status, 'pending'),
        ),
      )
      .where(eq(tickets.eventId, eventId))
      .orderBy(asc(tickets.createdAt));

    return rows.map((row) => ({
      ticketId: row.ticketId,
      userId: row.userId,
      name: row.name,
      email: row.email,
      phoneNumber: row.phoneNumber,
      program: row.program,
      checkedIn: row.checkedIn ?? false,
      tableSeat: row.tableSeat,
      busSeat: row.busSeat,
      registeredAt:
        row.registeredAt instanceof Date
          ? row.registeredAt.toISOString()
          : String(row.registeredAt),
      pendingRefund: row.refundRequestId != null,
    }));
  }

  async getTicketsForUser(userId: number) {
    const rows = await this.dbService.db
      .select({
        ticketId: tickets.id,
        eventId: tickets.eventId,
        checkedIn: tickets.checkedIn,
        busSeat: tickets.busSeat,
        tableSeat: tickets.tableSeat,
        qrCodeData: tickets.qrCodeData,
        createdAt: tickets.createdAt,
        eventName: events.name,
        eventDate: events.date,
        eventLocation: events.location,
        eventPrice: events.price,
        eventImageUrl: events.imageUrl,
        refundRequestId: refundRequests.id,
        refundRequestStatus: refundRequests.status,
        refundRequestAdminResponse: refundRequests.adminResponse,
        refundRequestCreatedAt: refundRequests.createdAt,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(
        refundRequests,
        and(
          eq(refundRequests.ticketId, tickets.id),
          eq(refundRequests.status, 'pending'), // Only show pending requests
        ),
      )
      .where(eq(tickets.userId, userId));

    // Transform to include refundRequest as nested object
    return rows.map((row) => ({
      ...row,
      refundRequest: row.refundRequestId
        ? {
            id: row.refundRequestId,
            status: row.refundRequestStatus,
            adminResponse: row.refundRequestAdminResponse,
            createdAt: row.refundRequestCreatedAt,
          }
        : null,
      // Remove the flattened fields
      refundRequestId: undefined,
      refundRequestStatus: undefined,
      refundRequestAdminResponse: undefined,
      refundRequestCreatedAt: undefined,
    }));
  }

  /** Create Stripe Checkout Session for event signup; user is only signed up after payment (via webhook). */
  async createCheckoutSession(
    eventId: number,
    userId: number,
    successUrl: string,
    cancelUrl: string,
    selectedTable?: number,
  ): Promise<{ url?: string; sessionId?: string; error?: string }> {
    const eventRows = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    if (!eventRows[0]) return { error: 'Event not found' };
    const ev = eventRows[0];

    if (ev.price > 0 && !ev.stripePriceId) {
      return {
        error:
          'This event requires payment but has no Stripe price configured.',
      };
    }

    const ticketCount = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tickets)
      .where(eq(tickets.eventId, eventId));
    if (ticketCount[0].count >= ev.capacity) {
      return { error: 'Event is full' };
    }

    const existing = await this.dbService.db
      .select()
      .from(tickets)
      .where(
        sql`${tickets.eventId} = ${eventId} AND ${tickets.userId} = ${userId}`,
      );
    if (existing.length > 0) {
      return { error: 'Already signed up for this event' };
    }

    const now = new Date();

    // If the same user retries checkout, clear any existing unexpired reservation
    // so they don't get blocked waiting for expiry.
    await this.dbService.db
      .delete(seatReservations)
      .where(
        and(
          eq(seatReservations.eventId, eventId),
          eq(seatReservations.userId, userId),
          sql`${seatReservations.expiresAt} > ${now}`,
        ),
      );

    const reservationMinutes = 5;
    const expiresAt = new Date(now.getTime() + reservationMinutes * 60 * 1000);

    // Wrap in a transaction to ensure FOR UPDATE SKIP LOCKED works
    // This prevents race conditions when multiple users click at the same time
    return await this.dbService.db.transaction(async (tx) => {
      let reservedTableSeatId: number | null = null;
      let reservedBusSeatId: number | null = null;

      // Use raw SQL with FOR UPDATE SKIP LOCKED to lock the selected seat row
      if (ev.requiresTableSignup) {
        const tableLockQuery =
          selectedTable != null
            ? sql`
              SELECT id FROM ${tableSeats}
              WHERE event_id = ${eventId}
                AND table_number = ${selectedTable}
                AND ticket_id IS NULL
                AND id NOT IN (
                  SELECT table_seat_id FROM ${seatReservations}
                  WHERE table_seat_id IS NOT NULL
                    AND expires_at > ${now}
                )
              ORDER BY table_number, seat_number
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            `
            : sql`
              SELECT id FROM ${tableSeats}
              WHERE event_id = ${eventId}
                AND ticket_id IS NULL
                AND id NOT IN (
                  SELECT table_seat_id FROM ${seatReservations}
                  WHERE table_seat_id IS NOT NULL
                    AND expires_at > ${now}
                )
              ORDER BY table_number, seat_number
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            `;

        const tableResult = await tx.execute(tableLockQuery);
        if (!tableResult.rows || tableResult.rows.length === 0) {
          return {
            error:
              'Event is full (no table seats left). Try another table or check back later.',
          };
        }
        const tableSeatRow = tableResult.rows[0] as Record<string, unknown>;
        reservedTableSeatId = tableSeatRow.id as number;
      }

      if (ev.requiresBusSignup) {
        const busLockQuery = sql`
          SELECT id FROM ${busSeats}
          WHERE event_id = ${eventId}
            AND ticket_id IS NULL
            AND id NOT IN (
              SELECT bus_seat_id FROM ${seatReservations}
              WHERE bus_seat_id IS NOT NULL
                AND expires_at > ${now}
            )
          ORDER BY bus_number, seat_number
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const busResult = await tx.execute(busLockQuery);
        if (!busResult.rows || busResult.rows.length === 0) {
          return { error: 'Event is full (no bus seats left).' };
        }
        const busSeatRow = busResult.rows[0] as Record<string, unknown>;
        reservedBusSeatId = busSeatRow.id as number;
      }

      // Delegate to PaymentsService for Stripe checkout
      const checkoutResult = await this.paymentsService.createCheckoutSession({
        eventId,
        userId,
        amount: ev.price,
        currency: 'usd',
        eventName: ev.name,
        successUrl,
        cancelUrl,
      });

      if (checkoutResult.error || !checkoutResult.url || !checkoutResult.sessionId) {
        return checkoutResult;
      }

      // Use the session ID returned from Stripe
      const sessionId = checkoutResult.sessionId;

      // Create seat reservation (seat is now locked until transaction completes)
      await tx.insert(seatReservations).values({
        stripeSessionId: sessionId,
        eventId,
        userId,
        tableSeatId: reservedTableSeatId,
        busSeatId: reservedBusSeatId,
        expiresAt,
      });

      return { url: checkoutResult.url, sessionId };
    });
  }

  async completeSignupFromReservation(
    stripeSessionId: string,
    paymentData?: {
      paymentIntentId: string | null;
      chargeId: string | null;
      amountPaid: number;
      currency: string;
    },
  ): Promise<{ ticket?: any; error?: string }> {
    const reservations = await this.dbService.db
      .select()
      .from(seatReservations)
      .where(eq(seatReservations.stripeSessionId, stripeSessionId))
      .limit(1);
    const reservation = reservations[0];
    if (!reservation) {
      return { error: 'Reservation not found or already used' };
    }
    const { eventId, userId, tableSeatId, busSeatId } = reservation;

    const existing = await this.dbService.db
      .select()
      .from(tickets)
      .where(
        sql`${tickets.eventId} = ${eventId} AND ${tickets.userId} = ${userId}`,
      );
    if (existing.length > 0) {
      await this.dbService.db
        .delete(seatReservations)
        .where(eq(seatReservations.id, reservation.id));
      return { error: 'Already signed up for this event', ticket: existing[0] };
    }

    const result = await this.dbService.db
      .insert(tickets)
      .values({ userId, eventId })
      .returning();
    const ticket = result[0];
    if (!ticket) {
      return { error: 'Failed to create ticket. Please try again.' };
    }

    // Generate and update QR code data
    const qrCodeData = this.generateQRCodeData(ticket.id, userId, eventId);
    await this.dbService.db
      .update(tickets)
      .set({ qrCodeData, updatedAt: new Date() })
      .where(eq(tickets.id, ticket.id));

    let assignedTableSeat: string | null = null;
    let assignedBusSeat: string | null = null;

    if (tableSeatId) {
      const seat = await this.dbService.db
        .select()
        .from(tableSeats)
        .where(eq(tableSeats.id, tableSeatId))
        .limit(1);
      if (seat[0]) {
        await this.dbService.db
          .update(tableSeats)
          .set({ ticketId: ticket.id, updatedAt: new Date() })
          .where(eq(tableSeats.id, tableSeatId));
        assignedTableSeat = `Table ${seat[0].tableNumber}, Seat ${seat[0].seatNumber}`;
      }
    }

    if (busSeatId) {
      const seat = await this.dbService.db
        .select()
        .from(busSeats)
        .where(eq(busSeats.id, busSeatId))
        .limit(1);
      if (seat[0]) {
        await this.dbService.db
          .update(busSeats)
          .set({ ticketId: ticket.id, updatedAt: new Date() })
          .where(eq(busSeats.id, busSeatId));
        assignedBusSeat = `Bus ${seat[0].busNumber} - Seat ${seat[0].seatNumber}`;
      }
    }

    if (assignedTableSeat || assignedBusSeat) {
      await this.dbService.db
        .update(tickets)
        .set({
          tableSeat: assignedTableSeat,
          busSeat: assignedBusSeat,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket.id));
    }

    // Save payment record if payment was made
    if (paymentData) {
      await this.paymentsService.recordPayment({
        userId,
        eventId,
        ticketId: ticket.id,
        stripeSessionId,
        paymentIntentId: paymentData.paymentIntentId,
        chargeId: paymentData.chargeId,
        amountPaid: paymentData.amountPaid,
        currency: paymentData.currency,
      });
    }

    await this.dbService.db
      .delete(seatReservations)
      .where(eq(seatReservations.id, reservation.id));

    return {
      ticket: {
        ...ticket,
        tableSeat: assignedTableSeat,
        busSeat: assignedBusSeat,
      },
    };
  }

  async releaseReservation(stripeSessionId: string): Promise<void> {
    await this.dbService.db
      .delete(seatReservations)
      .where(eq(seatReservations.stripeSessionId, stripeSessionId));
  }

  /** Internal signup logic; optional selectedTable for guaranteed table seat assignment. */
  private async signupInternal(
    eventId: number,
    userId: number,
    selectedTable?: number,
  ) {
    const existing = await this.dbService.db
      .select()
      .from(tickets)
      .where(
        sql`${tickets.eventId} = ${eventId} AND ${tickets.userId} = ${userId}`,
      );
    if (existing.length > 0) {
      return { error: 'Already signed up for this event', ticket: existing[0] };
    }

    const event = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    if (!event[0]) return { error: 'Event not found' };

    const ticketCount = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tickets)
      .where(eq(tickets.eventId, eventId));
    if (ticketCount[0].count >= event[0].capacity) {
      return { error: 'Event is full' };
    }

    // When table signup is required, don't create a ticket unless a seat is available (e.g. 1 table × 2 seats = max 2 signups)
    if (event[0].requiresTableSignup) {
      const tableConditions =
        selectedTable != null
          ? and(
              eq(tableSeats.eventId, eventId),
              eq(tableSeats.tableNumber, selectedTable),
              sql`${tableSeats.ticketId} IS NULL`,
            )
          : sql`${tableSeats.eventId} = ${eventId} AND ${tableSeats.ticketId} IS NULL`;
      const tableAvailable = await this.dbService.db
        .select({ id: tableSeats.id })
        .from(tableSeats)
        .where(tableConditions)
        .limit(1);
      if (tableAvailable.length === 0) {
        return {
          error:
            'Event is full (no table seats left). Try another table or check back later.',
        };
      }
    }

    // When bus signup is required, don't create a ticket unless a bus seat is available
    if (event[0].requiresBusSignup) {
      const busAvailable = await this.dbService.db
        .select({ id: busSeats.id })
        .from(busSeats)
        .where(
          sql`${busSeats.eventId} = ${eventId} AND ${busSeats.ticketId} IS NULL`,
        )
        .limit(1);
      if (busAvailable.length === 0) {
        return { error: 'Event is full (no bus seats left).' };
      }
    }

    const result = await this.dbService.db
      .insert(tickets)
      .values({ userId, eventId })
      .returning();
    const ticket = result[0];
    if (!ticket) {
      return { error: 'Failed to create ticket. Please try again.' };
    }

    // Generate and update QR code data
    const qrCodeData = this.generateQRCodeData(ticket.id, userId, eventId);
    await this.dbService.db
      .update(tickets)
      .set({ qrCodeData, updatedAt: new Date() })
      .where(eq(tickets.id, ticket.id));

    let assignedTableSeat: string | null = null;
    let assignedBusSeat: string | null = null;

    if (event[0].requiresTableSignup) {
      const conditions =
        selectedTable != null
          ? and(
              eq(tableSeats.eventId, eventId),
              eq(tableSeats.tableNumber, selectedTable),
              sql`${tableSeats.ticketId} IS NULL`,
            )
          : sql`${tableSeats.eventId} = ${eventId} AND ${tableSeats.ticketId} IS NULL`;
      const availableTableSeat = await this.dbService.db
        .select()
        .from(tableSeats)
        .where(conditions)
        .orderBy(asc(tableSeats.tableNumber), asc(tableSeats.seatNumber))
        .limit(1);

      if (availableTableSeat[0]) {
        await this.dbService.db
          .update(tableSeats)
          .set({ ticketId: ticket.id, updatedAt: new Date() })
          .where(eq(tableSeats.id, availableTableSeat[0].id));
        assignedTableSeat = `Table ${availableTableSeat[0].tableNumber}, Seat ${availableTableSeat[0].seatNumber}`;
      }
    }

    if (event[0].requiresBusSignup) {
      const availableBusSeat = await this.dbService.db
        .select()
        .from(busSeats)
        .where(
          sql`${busSeats.eventId} = ${eventId} AND ${busSeats.ticketId} IS NULL`,
        )
        .orderBy(asc(busSeats.busNumber), asc(busSeats.seatNumber))
        .limit(1);
      if (availableBusSeat[0]) {
        await this.dbService.db
          .update(busSeats)
          .set({ ticketId: ticket.id, updatedAt: new Date() })
          .where(eq(busSeats.id, availableBusSeat[0].id));
        assignedBusSeat = `Bus ${availableBusSeat[0].busNumber} - Seat ${availableBusSeat[0].seatNumber}`;
      }
    }

    if (assignedTableSeat || assignedBusSeat) {
      await this.dbService.db
        .update(tickets)
        .set({
          tableSeat: assignedTableSeat,
          busSeat: assignedBusSeat,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket.id));
    }

    await this.notificationsService.createNotification(
      userId,
      'confirmation',
      `You're registered for ${event[0].name}! Your ticket has been confirmed.`,
      eventId,
    );

    return {
      ticket: {
        ...ticket,
        tableSeat: assignedTableSeat,
        busSeat: assignedBusSeat,
      },
    };
  }
}
