import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { db, sharedSchema, overlaySchema } from '@teamd/database';
import { eq } from 'drizzle-orm';

// Debug schemas present at runtime
console.log("DEBUG sharedSchema keys:", Object.keys(sharedSchema));
console.log("DEBUG overlaySchema keys:", Object.keys(overlaySchema));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export async function paymentsRoutes(fastify: FastifyInstance) {

  fastify.post('/payments/create', async (request, reply) => {
    const body = request.body as any;
    const userId = Number(body?.userId);
    const eventId = Number(body?.eventId);

    if (!userId || !eventId) {
      return reply.status(400).send({
        success: false,
        error: { message: 'userId and eventId are required' },
      });
    }

    // Validate event exists (if team D schema contains events)
    if ((sharedSchema as any).events) {
      const existingEvent = await db
        .select()
        .from((sharedSchema as any).events)
        .where(eq((sharedSchema as any).events.id, eventId))
        .limit(1);

      if (existingEvent.length === 0)
        return reply.status(404).send({
          success: false,
          error: { message: 'Event not found' },
        });
    }

    // Validate user exists
    const existingUser = await db
      .select()
      .from((sharedSchema as any).users)
      .where(eq((sharedSchema as any).users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { message: 'User not found' },
      });
    }

    try {
      const pi = await stripe.paymentIntents.create({
        amount: 500,
        currency: 'cad',
        payment_method_types: ['card'],
        metadata: { userId: String(userId), eventId: String(eventId) },
      });

      const paymentIntentId = pi.id;

      // Store pending payment
      await db.insert((overlaySchema as any).payments).values({
        userId,
        eventId,
        stripePaymentIntentId: paymentIntentId,
        amount: 500,
        currency: 'cad',
        status: 'pending',
      });

      return {
        clientSecret: pi.client_secret || '',
        stripePaymentIntentId: paymentIntentId,
      };
    } catch (error) {
      fastify.log.error('PaymentIntent creation failed', error);
      return reply.status(500).send({
        success: false,
        error: { message: 'Failed to create payment' },
      });
    }
  });

  fastify.post('/payments/create_checkout_session', async (request, reply) => {
    const { userId, eventId } = request.body as any;

    if (!userId || !eventId) {
      return reply.status(400).send({
        success: false,
        error: { message: 'userId and eventId are required' },
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID || '', // replace later
            quantity: 1,
          },
        ],
        success_url: 'http://localhost:8081/',
        cancel_url:   'http://localhost:8081/',

        metadata: { userId: String(userId), eventId: String(eventId) },
      });

      return { url: session.url };
    } catch (err: any) {
      fastify.log.error('CheckoutSession error:', err);
      return reply.status(500).send({
        success: false,
        error: { message: err.message },
      });
    }
  });


  fastify.post('/payments/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    try {
      if (webhookSecret) {
        const raw = (request as any).rawBody;
        if (!raw) throw new Error('Missing rawBody');

        event = stripe.webhooks.constructEvent(raw, sig || '', webhookSecret);
      } else {
        fastify.log.warn('Webhook secret missing — signature not verified');
        event = request.body;
      }
    } catch (err: any) {
      fastify.log.error('Webhook signature failed:', err.message);
      return reply.status(400).send({ received: false });
    }

    // Store webhook event for debugging
    try {
      await db.insert((overlaySchema as any).stripeWebhooks).values({
        eventId: event.id || `evt_${Date.now()}`,
        payload: event,
        processed: false,
      });
    } catch {}

    // Handle payment success
    try {
      const type = event.type;

      if (
        type === 'payment_intent.succeeded' ||
        type === 'checkout.session.completed'
      ) {
        const obj = event.data.object;

        const piId =
          obj.id ||
          obj.payment_intent || // checkout.session.completed gives payment_intent
          null;

        if (!piId) return { received: true };

        const matches = await db
          .select()
          .from((overlaySchema as any).payments)
          .where(eq((overlaySchema as any).payments.stripePaymentIntentId, piId))
          .limit(1);

        if (matches.length === 0) {
          fastify.log.warn('PaymentIntent not found:', piId);
          return { received: true };
        }

        const payment = matches[0];

        await db
          .update((overlaySchema as any).payments)
          .set({ status: 'succeeded' })
          .where(eq((overlaySchema as any).payments.id, payment.id));

        // Create attendee + QR if schema allows
        try {
          if ((sharedSchema as any).attendees) {
            await db.insert((sharedSchema as any).attendees).values({
              eventId: payment.eventId,
              userId: payment.userId,
            });
          }

          if ((sharedSchema as any).qrCodes) {
            await db.insert((sharedSchema as any).qrCodes).values({
              eventId: payment.eventId,
              userId: payment.userId,
              code: `QR-${piId}`,
            });
          }
        } catch (err) {
          fastify.log.warn('Attendee/QR creation skipped', err);
        }
      }
    } catch (err) {
      fastify.log.error('Webhook processing error:', err);
    }

    return { received: true };
  });

  fastify.post('/payments/simulate_confirm', async (request, reply) => {
    const { stripePaymentIntentId } = request.body as any;

    if (!stripePaymentIntentId) {
      return reply.status(400).send({
        success: false,
        error: { message: 'stripePaymentIntentId required' },
      });
    }

    const payments = await db
      .select()
      .from((overlaySchema as any).payments)
      .where(
        eq(
          (overlaySchema as any).payments.stripePaymentIntentId,
          stripePaymentIntentId,
        ),
      )
      .limit(1);

    if (payments.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Payment not found' },
      });
    }

    const payment = payments[0];

    await db
      .update((overlaySchema as any).payments)
      .set({ status: 'succeeded' })
      .where(eq((overlaySchema as any).payments.id, payment.id));

    // Create attendee + QR if possible
    try {
      if ((sharedSchema as any).attendees) {
        await db.insert((sharedSchema as any).attendees).values({
          eventId: payment.eventId,
          userId: payment.userId,
        });
      }
      if ((sharedSchema as any).qrCodes) {
        await db.insert((sharedSchema as any).qrCodes).values({
          eventId: payment.eventId,
          userId: payment.userId,
          code: `QR-${stripePaymentIntentId}`,
        });
      }
    } catch {}

    return { success: true };
  });

}
