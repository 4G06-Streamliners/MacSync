import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { DatabaseService } from '../database/database.service';
import { payments, users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface CreateCheckoutSessionParams {
  eventId: number;
  userId: number;
  amount: number; // in cents
  currency?: string;
  eventName: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentData {
  paymentIntentId: string | null;
  chargeId: string | null;
  amountPaid: number;
  currency: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(private readonly dbService: DatabaseService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) this.stripe = new Stripe(key);
  }

  /**
   * Creates a Stripe Checkout Session for payment
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ url?: string; error?: string }> {
    if (!this.stripe) {
      return {
        error:
          'Payment is not configured. Set STRIPE_SECRET_KEY in the server environment.',
      };
    }

    const {
      eventId,
      userId,
      amount,
      currency = 'usd',
      eventName,
      successUrl,
      cancelUrl,
      metadata = {},
    } = params;

    try {
      const withSessionId = (u: string) =>
        `${u}${u.includes('?') ? '&' : '?'}stripeSessionId={CHECKOUT_SESSION_ID}`;

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: eventName,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: withSessionId(successUrl),
        cancel_url: withSessionId(cancelUrl),
        metadata: {
          eventId: String(eventId),
          userId: String(userId),
          ...metadata,
        },
      });

      return { url: session.url || undefined };
    } catch (err: any) {
      console.error('Stripe checkout session creation error:', err);
      return { error: err.message || 'Failed to create checkout session' };
    }
  }

  /**
   * Retrieves payment details from a completed Stripe session
   */
  async retrievePaymentDetails(
    session: Stripe.Checkout.Session,
  ): Promise<PaymentData | null> {
    if (!session.payment_intent || !this.stripe) {
      return null;
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        session.payment_intent as string,
        { expand: ['charges'] },
      );
      const charge = (paymentIntent as any).charges?.data?.[0];

      return {
        paymentIntentId: paymentIntent.id,
        chargeId: charge?.id || null,
        amountPaid: session.amount_total || 0,
        currency: session.currency || 'usd',
      };
    } catch (err) {
      console.error('Failed to retrieve payment details:', err);
      return null;
    }
  }

  /**
   * Records a payment in the database
   */
  async recordPayment(data: {
    userId: number;
    eventId: number;
    ticketId: number;
    stripeSessionId: string;
    paymentIntentId: string | null;
    chargeId: string | null;
    amountPaid: number;
    currency: string;
  }): Promise<void> {
    await this.dbService.db.insert(payments).values({
      userId: data.userId,
      eventId: data.eventId,
      ticketId: data.ticketId,
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.paymentIntentId,
      stripeChargeId: data.chargeId,
      amountPaid: data.amountPaid,
      currency: data.currency,
      status: 'succeeded',
      paymentDate: new Date(),
    });
  }

  /**
   * Issues a full or partial refund for a payment (admin only)
   */
  async refundPayment(
    paymentId: number,
    adminUserId: number,
    partialAmount?: number,
  ): Promise<{ success?: boolean; error?: string }> {
    // Check if requesting user is a system admin
    const adminRows = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);
    const admin = adminRows[0];
    if (!admin || !admin.isSystemAdmin) {
      return { error: 'Unauthorized: Admin access required' };
    }

    // Get payment record
    const paymentRows = await this.dbService.db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    const payment = paymentRows[0];
    if (!payment) {
      return { error: 'Payment not found' };
    }

    if (payment.status === 'refunded') {
      return { error: 'Payment already fully refunded' };
    }

    if (!payment.stripeChargeId && !payment.stripePaymentIntentId) {
      return {
        error: 'No Stripe charge or payment intent found for this payment',
      };
    }

    if (!this.stripe) {
      return { error: 'Stripe not configured' };
    }

    // Calculate refund amount
    const alreadyRefunded = payment.refundedAmount || 0;
    const maxRefundable = payment.amountPaid - alreadyRefunded;

    if (maxRefundable <= 0) {
      return { error: 'No amount left to refund' };
    }

    const refundAmount = partialAmount
      ? Math.min(partialAmount, maxRefundable)
      : maxRefundable;

    try {
      // Issue refund via Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId!,
        amount: refundAmount,
      });

      if (refund.status !== 'succeeded') {
        return { error: `Refund failed: ${refund.status}` };
      }

      // Update payment record
      const newRefundedAmount = alreadyRefunded + refundAmount;
      const newStatus =
        newRefundedAmount >= payment.amountPaid
          ? 'refunded'
          : 'partially_refunded';

      await this.dbService.db
        .update(payments)
        .set({
          refundedAmount: newRefundedAmount,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      return { success: true };
    } catch (err: any) {
      console.error('Refund error:', err);
      return { error: err.message || 'Failed to process refund' };
    }
  }

  /**
   * Get all payments for a user
   */
  async getPaymentsByUser(userId: number) {
    return this.dbService.db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId));
  }

  /**
   * Get all payments for an event
   */
  async getPaymentsByEvent(eventId: number) {
    return this.dbService.db
      .select()
      .from(payments)
      .where(eq(payments.eventId, eventId));
  }
}
