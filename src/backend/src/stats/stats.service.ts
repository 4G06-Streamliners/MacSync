import { Injectable } from '@nestjs/common';
import {
  count,
  sum,
  sql,
  gte,
  eq,
  desc,
  and,
  inArray,
  max,
} from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../users/authorization.service';
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
  constructor(
    private readonly dbService: DatabaseService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getDashboardStats(staffUserId: number): Promise<DashboardStats> {
    const access = await this.authorizationService.getStaffAccess(staffUserId);
    const ids = this.authorizationService.eventIdFilterForScopedAccess(access);
    const db = this.dbService.db;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (ids !== null && ids.length === 0) {
      return {
        userCount: 0,
        eventCount: 0,
        upcomingEventCount: 0,
        ticketsSold: 0,
        totalCapacity: 0,
        totalRevenue: 0,
        conversionRate: 0,
      };
    }

    const eventWhere =
      ids === null ? sql`true` : inArray(events.id, ids);
    const ticketWhere =
      ids === null ? sql`true` : inArray(tickets.eventId, ids);

    const userCountPromise =
      ids === null
        ? db.select({ value: count() }).from(users)
        : db
            .select({
              value: sql<number>`COUNT(DISTINCT ${tickets.userId})::int`,
            })
            .from(tickets)
            .where(inArray(tickets.eventId, ids));

    const [
      userCountResult,
      eventCountResult,
      upcomingResult,
      ticketsResult,
      capacityResult,
      revenueResult,
    ] = await Promise.all([
      userCountPromise,
      db
        .select({ value: count() })
        .from(events)
        .where(eventWhere),
      db
        .select({ value: count() })
        .from(events)
        .where(and(gte(events.date, today), eventWhere)),
      db
        .select({ value: count() })
        .from(tickets)
        .where(ticketWhere),
      db
        .select({ value: sum(events.capacity) })
        .from(events)
        .where(eventWhere),
      db
        .select({
          value: sql<number>`COALESCE(SUM(${events.price}), 0)::int`,
        })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id))
        .where(ticketWhere),
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
  async getRecentSignups(
    staffUserId: number,
    limit: number,
  ): Promise<RecentSignupDto[]> {
    const access = await this.authorizationService.getStaffAccess(staffUserId);
    const ids = this.authorizationService.eventIdFilterForScopedAccess(access);
    const db = this.dbService.db;
    const capped = Math.min(Math.max(Number(limit) || 10, 1), 100);

    if (ids !== null && ids.length === 0) {
      return [];
    }

    const ticketScope =
      ids === null ? sql`true` : inArray(tickets.eventId, ids);

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
      .where(ticketScope)
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
