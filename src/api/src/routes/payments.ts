import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { db, sharedSchema, overlaySchema } from "@teamd/database";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export async function paymentsRoutes(fastify: FastifyInstance) {
  fastify.post("/payments/checkout", async (req, reply) => {
    const { userId, eventId } = req.body as any;

    if (!userId || !eventId) {
      return reply.status(400).send({
        success: false,
        error: "userId and eventId are required",
      });
    }

    const users = await db
      .select()
      .from(sharedSchema.users)
      .where(eq(sharedSchema.users.id, userId))
      .limit(1);

    if (users.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "User not found",
      });
    }

    const user = users[0];

    const events = await db
      .select()
      .from(sharedSchema.events)
      .where(eq(sharedSchema.events.id, eventId))
      .limit(1);

    if (events.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "Event not found",
      });
    }

    const event = events[0];

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],

        line_items: [
          {
            price: event.stripePriceId,
            quantity: 1,
          },
        ],

        payment_intent_data: {
          metadata: {
            userId: String(userId),
            eventId: String(eventId),
            name: user.name,
            email: user.email,
          },
        },

        metadata: {
          userId: String(userId),
          eventId: String(eventId),
        },

        success_url: "macsync://payment-success",
        cancel_url: "macsync://payment-cancel",
      });

      return { success: true, url: session.url };
    } catch (err: any) {
      console.error("Checkout session error:", err);
      return reply.status(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  fastify.post("/payments/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string | undefined;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig || "",
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature failed:", err.message);
      return reply.status(400).send({ received: false });
    }

    await db.insert(overlaySchema.stripeWebhooks).values({
      eventId: event.id,
      payload: event.type,
      processed: false,
    });

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;

      const piId = pi.id;
      const userId = Number(pi.metadata.userId);
      const eventId = Number(pi.metadata.eventId);
      const name = pi.metadata.name;
      const email = pi.metadata.email;

      const events = await db
        .select()
        .from(sharedSchema.events)
        .where(eq(sharedSchema.events.id, eventId))
        .limit(1);

      if (events.length === 0) return { received: true };
      const selectedEvent = events[0];

      const existing = await db
        .select()
        .from(overlaySchema.payments)
        .where(eq(overlaySchema.payments.stripePaymentIntentId, piId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(overlaySchema.payments).values({
          userId,
          eventId,
          stripePaymentIntentId: piId,
          amount: selectedEvent.price,
          currency: "cad",
          status: "succeeded",
        });

        const [attendee] = await db
          .insert(sharedSchema.attendees)
          .values({
            name,
            email,
            userId,
            eventId,
          })
          .returning({ id: sharedSchema.attendees.id });

        await db.insert(sharedSchema.qrCodes).values({
          attendeeId: attendee.id,
          code: `QR-${piId}`,
        });
      }
    }

    return { received: true };
  });

  fastify.get("/payments/latest/:userId", async (req, reply) => {
    const userId = Number((req.params as any).userId);

    const rows = await db
      .select()
      .from(overlaySchema.payments)
      .where(eq(overlaySchema.payments.userId, userId))
      .orderBy(overlaySchema.payments.id)
      .limit(1);

    return { success: true, data: rows[0] || null };
  });

  fastify.get("/users/:id/events", async (req, reply) => {
    const userId = Number((req.params as any).id);

    try {
      const events = await db
        .select({
          attendeeId: sharedSchema.attendees.id,
          eventId: sharedSchema.attendees.eventId,
          name: sharedSchema.events.name,
          date: sharedSchema.events.date,
          location: sharedSchema.events.location,
        })
        .from(sharedSchema.attendees)
        .innerJoin(
          sharedSchema.events,
          eq(sharedSchema.attendees.eventId, sharedSchema.events.id)
        )
        .where(eq(sharedSchema.attendees.userId, userId));

      return { success: true, events };
    } catch (err) {
      console.error("Error loading user events:", err);
      return reply.status(500).send({ success: false });
    }
  });
}
