import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { events, tickets, tableSeats, busSeats } from '../db/schema';
import type { NewEvent } from '../db/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import {
  createTableSeatsForEvent,
  createBusSeatsForEvent,
} from '../db/seed-data';

@Injectable()
export class EventsService {
  constructor(private readonly dbService: DatabaseService) {}

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
      .orderBy(events.date);

    return rows;
  }

  async findOne(id: number) {
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

    return rows[0] ?? null;
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

  async signup(eventId: number, userId: number) {
    // Check if already signed up
    const existing = await this.dbService.db
      .select()
      .from(tickets)
      .where(
        sql`${tickets.eventId} = ${eventId} AND ${tickets.userId} = ${userId}`,
      );

    if (existing.length > 0) {
      return { error: 'Already signed up for this event', ticket: existing[0] };
    }

    // Check capacity
    const event = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    if (!event[0]) {
      return { error: 'Event not found' };
    }

    const ticketCount = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tickets)
      .where(eq(tickets.eventId, eventId));

    if (ticketCount[0].count >= event[0].capacity) {
      return { error: 'Event is full' };
    }

    // Create ticket
    const result = await this.dbService.db
      .insert(tickets)
      .values({ userId, eventId })
      .returning();

    const ticket = result[0];

    let assignedTableSeat: string | null = null;
    let assignedBusSeat: string | null = null;

    // Auto-assign table seat if required
    if (event[0].requiresTableSignup) {
      const availableTableSeat = await this.dbService.db
        .select()
        .from(tableSeats)
        .where(
          sql`${tableSeats.eventId} = ${eventId} AND ${tableSeats.ticketId} IS NULL`,
        )
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

    // Auto-assign bus seat if required
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

    // Update ticket with seat display strings
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
}
