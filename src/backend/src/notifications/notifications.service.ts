import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../users/authorization.service';
import { notifications, tickets, events, users } from '../db/schema';
import { eq, and, gte, lt, sql, inArray } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async createNotification(
    userId: number,
    type: string,
    message: string,
    eventId?: number,
  ) {
    const userRows = await this.dbService.db
      .select({ notifInApp: users.notifInApp })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRows[0]?.notifInApp) return null;

    const result = await this.dbService.db
      .insert(notifications)
      .values({ userId, type, message, eventId: eventId ?? null })
      .returning();

    return result[0];
  }

  async getForUser(userId: number) {
    return this.dbService.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(sql`${notifications.createdAt} DESC`);
  }

  async markRead(notificationId: number, userId: number) {
    await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    return { success: true };
  }

  async updatePreference(userId: number, notifInApp: boolean) {
    await this.dbService.db
      .update(users)
      .set({ notifInApp, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { success: true };
  }

  async blast(adminId: number, eventId: number, customMessage?: string) {
    const eventRows = await this.dbService.db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventRows[0];
    if (!event) return { error: 'Event not found' };
    try {
      await this.authorizationService.assertCanManageEvent(adminId, eventId);
    } catch {
      return { error: 'Not your event' };
    }

    const attendees = await this.dbService.db
      .select({ userId: tickets.userId })
      .from(tickets)
      .where(eq(tickets.eventId, eventId));

    if (attendees.length === 0) return { sent: 0 };

    const message = customMessage
      ? `${event.name}: ${customMessage}`
      : `Update from the organizer for ${event.name}.`;

    let sent = 0;
    for (const { userId } of attendees) {
      const result = await this.createNotification(userId, 'blast', message, eventId);
      if (result) sent++;
    }

    return { sent };
  }

  /** Events this admin may blast (global admin: all events). */
  async getManagedEventsForBlast(adminId: number) {
    const access = await this.authorizationService.getStaffAccess(adminId);
    if (access.isGlobalAdmin) {
      return this.dbService.db
        .select({ id: events.id, name: events.name, date: events.date })
        .from(events)
        .orderBy(events.date);
    }
    if (access.managedEventIds.length === 0) {
      return [];
    }
    return this.dbService.db
      .select({ id: events.id, name: events.name, date: events.date })
      .from(events)
      .where(inArray(events.id, access.managedEventIds))
      .orderBy(events.date);
  }

  @Cron('0 9 * * *')
  async sendDailyReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcoming = await this.dbService.db
      .select({
        userId: tickets.userId,
        eventId: events.id,
        eventName: events.name,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(and(gte(events.date, windowStart), lt(events.date, windowEnd)));

    for (const row of upcoming) {
      const existing = await this.dbService.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, row.userId),
            eq(notifications.eventId, row.eventId),
            eq(notifications.type, 'reminder'),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      await this.createNotification(
        row.userId,
        'reminder',
        `REMINDER: ${row.eventName} is happening in 24 hours.`,
        row.eventId,
      );
    }
  }
}
