import { pgTable, serial, integer, varchar, timestamp, json, boolean } from 'drizzle-orm/pg-core'

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  eventId: integer('event_id').notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).notNull(),
  amount: integer('amount').notNull(), // cents
  currency: varchar('currency', { length: 10 }).default('cad'),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const stripeWebhooks = pgTable('stripe_webhooks', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  payload: json('payload'),
  processed: boolean('processed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})
