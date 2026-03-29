import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthorizationService } from '../users/authorization.service';
import { refundRequests, users, tickets, events, payments } from '../db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

@Injectable()
export class RefundRequestsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * User requests a refund for their ticket
   */
  async createRefundRequest(
    userId: number,
    ticketId: number,
    reason?: string,
  ): Promise<{ success?: boolean; error?: string; requestId?: number }> {
    // Verify ticket belongs to user
    const ticketRows = await this.dbService.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
      .limit(1);

    if (ticketRows.length === 0) {
      return { error: 'Ticket not found or does not belong to you' };
    }

    const ticket = ticketRows[0];

    const eventRow = await this.dbService.db
      .select({ date: events.date })
      .from(events)
      .where(eq(events.id, ticket.eventId))
      .limit(1);
    if (
      eventRow[0] &&
      new Date(eventRow[0].date).getTime() < Date.now()
    ) {
      return {
        error:
          'Refund requests are not available after the event date has passed.',
      };
    }

    // Check if refund request already exists
    const existingRequests = await this.dbService.db
      .select()
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.ticketId, ticketId),
          eq(refundRequests.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingRequests.length > 0) {
      return { error: 'A refund request is already pending for this ticket' };
    }

    // Find associated payment
    const paymentRows = await this.dbService.db
      .select()
      .from(payments)
      .where(eq(payments.ticketId, ticketId))
      .limit(1);

    const payment = paymentRows[0] || null;

    // Create refund request
    const result = await this.dbService.db
      .insert(refundRequests)
      .values({
        ticketId,
        userId,
        eventId: ticket.eventId,
        paymentId: payment?.id,
        reason: reason || null,
        status: 'pending',
      })
      .returning();

    return { success: true, requestId: result[0].id };
  }

  /**
   * Get refund requests visible to this staff user (scoped by managed events).
   */
  async getAllRefundRequests(adminUserId: number) {
    const access = await this.authorizationService.getStaffAccess(adminUserId);
    if (!access.isGlobalAdmin && access.managedEventIds.length === 0) {
      // Team admins without mapped events should see an empty list, not a hard 403.
      return [];
    }

    const eventFilter = this.authorizationService.eventIdFilterForScopedAccess(
      access,
    );

    const requests = await this.dbService.db
      .select({
        id: refundRequests.id,
        ticketId: refundRequests.ticketId,
        userId: refundRequests.userId,
        eventId: refundRequests.eventId,
        paymentId: refundRequests.paymentId,
        reason: refundRequests.reason,
        status: refundRequests.status,
        adminResponse: refundRequests.adminResponse,
        processedBy: refundRequests.processedBy,
        processedAt: refundRequests.processedAt,
        createdAt: refundRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
        eventName: events.name,
        eventDate: events.date,
        amountPaidCents: payments.amountPaid,
      })
      .from(refundRequests)
      .leftJoin(users, eq(refundRequests.userId, users.id))
      .leftJoin(events, eq(refundRequests.eventId, events.id))
      .leftJoin(payments, eq(refundRequests.paymentId, payments.id))
      .where(
        eventFilter === null
          ? sql`true`
          : inArray(refundRequests.eventId, eventFilter),
      )
      .orderBy(desc(refundRequests.createdAt));

    return requests;
  }

  /**
   * Get refund requests for a specific user
   */
  async getUserRefundRequests(userId: number) {
    const requests = await this.dbService.db
      .select({
        id: refundRequests.id,
        ticketId: refundRequests.ticketId,
        eventId: refundRequests.eventId,
        paymentId: refundRequests.paymentId,
        reason: refundRequests.reason,
        status: refundRequests.status,
        adminResponse: refundRequests.adminResponse,
        processedAt: refundRequests.processedAt,
        createdAt: refundRequests.createdAt,
        eventName: events.name,
        eventDate: events.date,
        amountPaidCents: payments.amountPaid,
      })
      .from(refundRequests)
      .leftJoin(events, eq(refundRequests.eventId, events.id))
      .leftJoin(payments, eq(refundRequests.paymentId, payments.id))
      .where(eq(refundRequests.userId, userId))
      .orderBy(desc(refundRequests.createdAt));

    return requests;
  }

  /**
   * Approve refund request and process refund via Stripe (admin only)
   */
  async approveRefundRequest(
    requestId: number,
    adminUserId: number,
    adminResponse?: string,
  ): Promise<{ success?: boolean; error?: string }> {
    // Get refund request
    const requestRows = await this.dbService.db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, requestId))
      .limit(1);

    if (requestRows.length === 0) {
      return { error: 'Refund request not found' };
    }

    const request = requestRows[0];

    try {
      await this.authorizationService.assertCanManageEvent(
        adminUserId,
        request.eventId,
      );
    } catch {
      return { error: 'Admin access required' };
    }

    if (request.status !== 'pending') {
      return { error: 'Refund request has already been processed' };
    }

    // Process refund via PaymentsService if payment exists
    if (request.paymentId) {
      const refundResult = await this.paymentsService.refundPayment(
        request.paymentId,
        adminUserId,
      );

      if (refundResult.error) {
        return { error: `Refund failed: ${refundResult.error}` };
      }
    }

    // Update refund request status
    await this.dbService.db
      .update(refundRequests)
      .set({
        status: 'approved',
        adminResponse: adminResponse || null,
        processedBy: adminUserId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));

    // Delete the ticket if it exists
    if (request.ticketId) {
      await this.dbService.db
        .delete(tickets)
        .where(eq(tickets.id, request.ticketId));
    }

    // Send cancellation notification
    const eventRows = await this.dbService.db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, request.eventId))
      .limit(1);
    const eventName = eventRows[0]?.name ?? 'your event';
    await this.notificationsService.createNotification(
      request.userId,
      'cancellation',
      `Your refund for ${eventName} has been approved.`,
      request.eventId,
    );

    return { success: true };
  }

  /**
   * Deny refund request (admin only)
   */
  async denyRefundRequest(
    requestId: number,
    adminUserId: number,
    adminResponse?: string,
  ): Promise<{ success?: boolean; error?: string }> {
    // Get refund request
    const requestRows = await this.dbService.db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, requestId))
      .limit(1);

    if (requestRows.length === 0) {
      return { error: 'Refund request not found' };
    }

    const request = requestRows[0];

    try {
      await this.authorizationService.assertCanManageEvent(
        adminUserId,
        request.eventId,
      );
    } catch {
      return { error: 'Admin access required' };
    }

    if (request.status !== 'pending') {
      return { error: 'Refund request has already been processed' };
    }

    // Update refund request status
    await this.dbService.db
      .update(refundRequests)
      .set({
        status: 'denied',
        adminResponse: adminResponse || 'Refund request denied',
        processedBy: adminUserId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));

    return { success: true };
  }
}
