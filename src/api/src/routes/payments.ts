import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { db } from '@large-event/database'
import * as sharedSchema from '@large-event/database/schemas'
import * as overlaySchema from '@teamd/database/overlays'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

export async function paymentsRoutes(fastify: FastifyInstance) {
  // POST /api/payments/create
  fastify.post('/payments/create', async (request, reply) => {
    const body = request.body as any
    const userId = Number(body?.userId)
    const eventId = Number(body?.eventId)

    if (!userId || !eventId) {
      return reply.status(400).send({ success: false, error: { message: 'userId and eventId are required' } })
    }

    // Validate event and user exist
    const existingEvent = await db.select().from((sharedSchema as any).events).where(eq((sharedSchema as any).events.id, eventId)).limit(1)
    if (existingEvent.length === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Event not found' } })
    }

    const existingUser = await db.select().from((sharedSchema as any).users).where(eq((sharedSchema as any).users.id, userId)).limit(1)
    if (existingUser.length === 0) {
      return reply.status(404).send({ success: false, error: { message: 'User not found' } })
    }

    try {
      // Create real PaymentIntent using Stripe
      if (!process.env.STRIPE_SECRET_KEY) {
        fastify.log.warn('STRIPE_SECRET_KEY not set, falling back to mock PaymentIntent')
      }

      const pi = await stripe.paymentIntents.create({
        amount: 500,
        currency: 'cad',
        metadata: { userId: String(userId), eventId: String(eventId) },
        payment_method_types: ['card'],
      })

      const paymentIntentId = pi.id
      const clientSecret = pi.client_secret || ''

      // Store pending payment in overlay payments table
      await db.insert((overlaySchema as any).payments).values({
        userId,
        eventId,
        stripePaymentIntentId: paymentIntentId,
        amount: 500,
        currency: 'cad',
        status: 'pending',
      })

      return { clientSecret, stripePaymentIntentId: paymentIntentId }
    } catch (error) {
      fastify.log.error('Failed to create PaymentIntent or DB row', error)
      return reply.status(500).send({ success: false, error: { message: 'Failed to create payment' } })
    }
  })

  // POST /api/payments/webhook
  // Stripe will POST events here. We verify signature when STRIPE_WEBHOOK_SECRET is set.
  fastify.post('/payments/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string | undefined
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    let event: any

    try {
      if (webhookSecret) {
        const raw = (request as any).rawBody
        if (!raw) throw new Error('Missing rawBody for signature verification')
        event = stripe.webhooks.constructEvent(raw, sig || '', webhookSecret)
      } else {
        // No webhook secret configured — accept the parsed body but log a warning
        fastify.log.warn('STRIPE_WEBHOOK_SECRET not set — webhook signature will not be verified')
        event = request.body
      }
    } catch (err: any) {
      fastify.log.error('Webhook signature verification failed:', err?.message || err)
      return reply.status(400).send({ received: false })
    }

    // Store webhook payload for debugging
    try {
      await db.insert((overlaySchema as any).stripeWebhooks).values({ eventId: event.id || `evt_${Date.now()}`, payload: event, processed: false })
    } catch (err) {
      fastify.log.warn('Failed to store webhook payload', err)
    }

    // Handle events
    try {
      if (event.type === 'payment_intent.succeeded' || (event.type && event.type === 'checkout.session.completed')) {
        const pi = event.data.object
        const piId = pi.id

        const payments = await db.select().from((overlaySchema as any).payments).where(eq((overlaySchema as any).payments.stripePaymentIntentId, piId)).limit(1)
        if (payments.length > 0) {
          const payment = payments[0]
          await db.update((overlaySchema as any).payments).set({ status: 'succeeded' }).where(eq((overlaySchema as any).payments.id, payment.id))

          // create attendee + qr code if shared tables are present
          try {
            if ((sharedSchema as any).attendees) {
              await db.insert((sharedSchema as any).attendees).values({ userId: payment.userId, eventId: payment.eventId })
            }
            if ((sharedSchema as any).qrCodes) {
              await db.insert((sharedSchema as any).qrCodes).values({ eventId: payment.eventId, userId: payment.userId, code: `QR-${piId}` })
            }
          } catch (err) {
            fastify.log.warn('Failed to create attendee/qr record', err)
          }
        } else {
          fastify.log.warn('Payment row not found for PaymentIntent:', piId)
        }
      }
    } catch (err) {
      fastify.log.error('Error handling webhook event', err)
    }

    return { received: true }
  })

    // POST /api/payments/simulate_confirm
    // Keep a local helper for dev/mobile POC to simulate webhook processing
    fastify.post('/payments/simulate_confirm', async (request, reply) => {
      const body = request.body as any
      const piId = body?.stripePaymentIntentId
      if (!piId) {
        return reply.status(400).send({ success: false, error: { message: 'stripePaymentIntentId required' } })
      }

      // Store webhook record
      await db.insert((overlaySchema as any).stripeWebhooks).values({ eventId: `mock_evt_${Date.now()}`, payload: body, processed: true })

      // Find payment
      const payments = await db.select().from((overlaySchema as any).payments).where(eq((overlaySchema as any).payments.stripePaymentIntentId, piId)).limit(1)
      if (payments.length === 0) {
        return reply.status(404).send({ success: false, error: { message: 'Payment not found' } })
      }

      const payment = payments[0]

      // Update payment status
      await db.update((overlaySchema as any).payments).set({ status: 'succeeded' }).where(eq((overlaySchema as any).payments.id, payment.id))

      // Create attendee + QR code if shared tables exist
      try {
        if ((sharedSchema as any).attendees) {
          await db.insert((sharedSchema as any).attendees).values({ userId: payment.userId, eventId: payment.eventId })
        }
        if ((sharedSchema as any).qrCodes) {
          await db.insert((sharedSchema as any).qrCodes).values({ eventId: payment.eventId, userId: payment.userId, code: `QR-${piId}` })
        }
      } catch (err) {
        fastify.log.warn('Could not create attendee/qr record (maybe tables missing in this environment)', err)
      }

      return { success: true }
    })
}
