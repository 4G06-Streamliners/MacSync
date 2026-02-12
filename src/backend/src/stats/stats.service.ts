import { Injectable } from '@nestjs/common';
import { count, sum, sql, gte, inArray, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users, events, tickets, payments } from '../db/schema';

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
}
