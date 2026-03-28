import { Injectable } from '@nestjs/common';
import { count, sum, sql, gte, eq, desc, and, inArray, max } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users, events, tickets, payments } from '../db/schema';

export interface RecentSignupDto {
  ticketId: number;
  userId: number;
  buyerName: string;
  eventId: number;
  eventName: string;
  ticketCount: number;
  /** Display amount: recorded payment if present, otherwise event list price (0 for free). */
  totalCents: number;
  registeredAt: string;
}

export interface DashboardStats {
  userCount: number;
  eventCount: number;
  upcomingEventCount: number;
  ticketsSold: number;
  totalCapacity: number;
  totalRevenue: number;
  conversionRate: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const db = this.dbService.db;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [
      userCountResult,
      eventCountResult,
      upcomingResult,
      ticketsResult,
      capacityResult,
      revenueResult,
    ] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(events),
      db.select({ value: count() }).from(events).where(gte(events.date, today)),
      db.select({ value: count() }).from(tickets),
      db.select({ value: sum(events.capacity) }).from(events),
      // Calculate revenue from tickets × event price (covers tickets without payment records)
      db
        .select({
          value: sql<number>`COALESCE(SUM(${events.price}), 0)::int`,
        })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id)),
    ]);

    const userCount = Number(userCountResult[0]?.value ?? 0);
    const eventCount = Number(eventCountResult[0]?.value ?? 0);
    const upcomingEventCount = Number(upcomingResult[0]?.value ?? 0);
    const ticketsSold = Number(ticketsResult[0]?.value ?? 0);
    const totalCapacity = Number(capacityResult[0]?.value ?? 0);
    const totalRevenue = Number(revenueResult[0]?.value ?? 0);

    const conversionRate =
      totalCapacity > 0
        ? Math.round((ticketsSold / totalCapacity) * 100 * 100) / 100
        : 0;

    return {
      userCount,
      eventCount,
      upcomingEventCount,
      ticketsSold,
      totalCapacity,
      totalRevenue,
      conversionRate,
    };
  }

  /**
   * Recent event signups (one row per ticket), including free events without a payment row.
   */
  async getRecentSignups(limit: number): Promise<RecentSignupDto[]> {
    const db = this.dbService.db;
    const capped = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const rows = await db
      .select({
        ticketId: tickets.id,
        userId: tickets.userId,
        buyerName: users.name,
        eventId: tickets.eventId,
        eventName: events.name,
        eventPrice: events.price,
        paidAmount: max(payments.amountPaid),
        registeredAt: tickets.createdAt,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(
        payments,
        and(
          eq(payments.ticketId, tickets.id),
          inArray(payments.status, ['succeeded', 'partially_refunded'] as const),
        ),
      )
      .groupBy(
        tickets.id,
        tickets.userId,
        tickets.createdAt,
        users.id,
        users.name,
        events.id,
        events.name,
        events.price,
      )
      .orderBy(desc(tickets.createdAt))
      .limit(capped);

    return rows.map((r) => {
      const paid = r.paidAmount != null ? Number(r.paidAmount) : null;
      const price = Number(r.eventPrice);
      const totalCents = paid ?? price;
      const reg = r.registeredAt;
      return {
        ticketId: r.ticketId,
        userId: r.userId,
        buyerName: r.buyerName,
        eventId: r.eventId,
        eventName: r.eventName,
        ticketCount: 1,
        totalCents,
        registeredAt:
          reg instanceof Date ? reg.toISOString() : String(reg),
      };
    });
  }
}
