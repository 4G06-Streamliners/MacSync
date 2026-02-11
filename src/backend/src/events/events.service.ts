import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaymentsService } from '../payments/payments.service';
import {
  events,
  tickets,
  tableSeats,
  busSeats,
  seatReservations,
} from '../db/schema';
import type { NewEvent } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import {
  createTableSeatsForEvent,
  createBusSeatsForEvent,
} from '../db/seed-data';

@Injectable()
export class EventsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly paymentsService: PaymentsService,
  ) {}


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
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        registeredCount: sql<number>`(SELECT COUNT(*) FROM tickets WHERE tickets.event_id = ${events.id})::int`,
      })
      .from(events)
      .where(eq(events.id, id));

    let row = rows[0] ?? null;
    if (!row) return null;

    let userTicket: { tableSeat: string | null; busSeat: string | null } | null =
      null;
    if (userId != null) {
      const ticketRows = await this.dbService.db
        .select({
          tableSeat: tickets.tableSeat,
          busSeat: tickets.busSeat,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.eventId, id),
            eq(tickets.userId, userId),
          ),
        )
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
    // Ensure date is a Date object (JSON sends it as a string)
    const values = {
      ...event,
      date: new Date(event.date as any),
    };

    const result = await this.dbService.db
      .insert(events)
      .values(values)
      .returning();
    const created = result[0];

    // Stripe Price ID should be provided when creating paid events
    // PaymentsService handles the Stripe integration

    // Auto-create table seats if needed
    if (
      created.requiresTableSignup &&
      created.tableCount &&
      created.seatsPerTable
    ) {
      await createTableSeatsForEvent(
        this.dbService.db as any,
        created.id,
        created.tableCount,
        created.seatsPerTable,
      );
    }

    // Auto-create bus seats if needed
    if (
      created.requiresBusSignup &&
      created.busCount &&
      created.busCapacity
    ) {
      await createBusSeatsForEvent(
        this.dbService.db as any,
        created.id,
        created.busCount,
        created.busCapacity,
      );
    }

    return created;
  }

  async update(id: number, event: Partial<NewEvent>) {
    // Stripe Price ID should be provided when updating paid events
    // PaymentsService handles the Stripe integration
    const result = await this.dbService.db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number) {
    await this.dbService.db.delete(events).where(eq(events.id, id));
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
    await this.dbService.db
      .delete(tickets)
      .where(eq(tickets.id, ticket.id));

    return { cancelled: true };
  }

  async getTicketsForUser(userId: number) {
    const rows = await this.dbService.db
      .select({
        ticketId: tickets.id,
        eventId: tickets.eventId,
        checkedIn: tickets.checkedIn,
        busSeat: tickets.busSeat,
        tableSeat: tickets.tableSeat,
        createdAt: tickets.createdAt,
        eventName: events.name,
        eventDate: events.date,
        eventLocation: events.location,
        eventPrice: events.price,
        eventImageUrl: events.imageUrl,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(eq(tickets.userId, userId));

    return rows;
  }

  /** Create Stripe Checkout Session for event signup; user is only signed up after payment (via webhook). */
  async createCheckoutSession(
    eventId: number,
    userId: number,
    successUrl: string,
    cancelUrl: string,
    selectedTable?: number,
  ): Promise<{ url?: string; error?: string }> {
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
    const notReservedTable =
      sql`${tableSeats.id} NOT IN (SELECT table_seat_id FROM seat_reservations WHERE table_seat_id IS NOT NULL AND expires_at > ${now})`;

    let reservedTableSeatId: number | null = null;
    if (ev.requiresTableSignup) {
      const tableConditions =
        selectedTable != null
          ? and(
              eq(tableSeats.eventId, eventId),
              eq(tableSeats.tableNumber, selectedTable),
              sql`${tableSeats.ticketId} IS NULL`,
              notReservedTable,
            )
          : and(
              eq(tableSeats.eventId, eventId),
              sql`${tableSeats.ticketId} IS NULL`,
              notReservedTable,
            );
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
      reservedTableSeatId = tableAvailable[0].id;
    }

    let reservedBusSeatId: number | null = null;
    if (ev.requiresBusSignup) {
      const notReservedBus =
        sql`${busSeats.id} NOT IN (SELECT bus_seat_id FROM seat_reservations WHERE bus_seat_id IS NOT NULL AND expires_at > ${now})`;
      const busAvailable = await this.dbService.db
        .select({ id: busSeats.id })
        .from(busSeats)
        .where(
          and(
            eq(busSeats.eventId, eventId),
            sql`${busSeats.ticketId} IS NULL`,
            notReservedBus,
          ),
        )
        .limit(1);
      if (busAvailable.length === 0) {
        return { error: 'Event is full (no bus seats left).' };
      }
      reservedBusSeatId = busAvailable[0].id;
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

    if (checkoutResult.error || !checkoutResult.url) {
      return checkoutResult;
    }

    // Extract session ID from the URL
    // Stripe's checkout URL format: https://checkout.stripe.com/c/pay/cs_test_...
    const sessionId = checkoutResult.url.split('/').pop()?.split('#')[0] || '';

    // Create seat reservation
    await this.dbService.db.insert(seatReservations).values({
      stripeSessionId: sessionId,
      eventId,
      userId,
      tableSeatId: reservedTableSeatId,
      busSeatId: reservedBusSeatId,
      expiresAt,
    });

    return checkoutResult;
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
        .orderBy(tableSeats.tableNumber, tableSeats.seatNumber)
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
        .orderBy(busSeats.busNumber, busSeats.seatNumber)
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

    return {
      ticket: {
        ...ticket,
        tableSeat: assignedTableSeat,
        busSeat: assignedBusSeat,
      },
    };
  }
}
