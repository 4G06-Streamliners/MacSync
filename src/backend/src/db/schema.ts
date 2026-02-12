import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  integer,
  text,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

// ------------------- USER PROFILE -------------------
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 255 }).notNull(),
  program: varchar('program', { length: 255 }),
  isSystemAdmin: boolean('is_system_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ------------------- EMAIL VERIFICATION TOKENS -------------------
export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// ------------------- ROLES -------------------
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ------------------- USER ROLES (JUNCTION) -------------------
export const userRoles = pgTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// ------------------- EVENTS -------------------
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  location: varchar('location', { length: 255 }),
  capacity: integer('capacity').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  price: integer('price').notNull(), // in cents
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  requiresTableSignup: boolean('requires_table_signup').default(false),
  requiresBusSignup: boolean('requires_bus_signup').default(false),
  // For table seats: number of tables, seats per table (e.g. 10 tables × 8 seats)
  tableCount: integer('table_count'),
  seatsPerTable: integer('seats_per_table'),
  // For bus seats: number of buses, capacity per bus (e.g. 2 buses × 50 seats)
  busCount: integer('bus_count'),
  busCapacity: integer('bus_capacity'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// ------------------- TICKETS -------------------
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  checkedIn: boolean('checked_in').default(false),
  busSeat: varchar('bus_seat', { length: 50 }), // e.g. "Bus 1 - Seat 5" (display)
  tableSeat: varchar('table_seat', { length: 50 }), // e.g. "Table 5, Seat 4" (display)
  qrCodeData: varchar('qr_code_data', { length: 255 }), // QR code data for ticket verification
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

// ------------------- PAYMENTS -------------------
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  ticketId: integer('ticket_id').references(() => tickets.id, {
    onDelete: 'set null',
  }),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  amountPaid: integer('amount_paid').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).default('usd'),
  status: varchar('status', { length: 50 }).notNull(), // 'succeeded', 'refunded', 'partially_refunded'
  refundedAmount: integer('refunded_amount').default(0), // in cents
  paymentDate: timestamp('payment_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ------------------- TABLE SEATS (one row per physical seat per event; user picks table + seat) -------------------
export const tableSeats = pgTable(
  'table_seats',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tableNumber: integer('table_number').notNull(),
    seatNumber: integer('seat_number').notNull(),
    ticketId: integer('ticket_id').references(() => tickets.id, {
      onDelete: 'set null',
    }), // when set, seat is taken
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    unique('table_seats_event_table_seat_key').on(
      t.eventId,
      t.tableNumber,
      t.seatNumber,
    ),
  ],
);

export type TableSeat = typeof tableSeats.$inferSelect;
export type NewTableSeat = typeof tableSeats.$inferInsert;

// ------------------- BUS SEATS (one row per seat per event; auto-assign next available) -------------------
export const busSeats = pgTable('bus_seats', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  busNumber: integer('bus_number').notNull(),
  seatNumber: integer('seat_number').notNull(),
  ticketId: integer('ticket_id').references(() => tickets.id, {
    onDelete: 'set null',
  }), // when set, seat is taken
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type BusSeat = typeof busSeats.$inferSelect;
export type NewBusSeat = typeof busSeats.$inferInsert;

// ------------------- SEAT RESERVATIONS (hold seat during Stripe checkout; expire after 5 min or on payment/cancel) -------------------
export const seatReservations = pgTable('seat_reservations', {
  id: serial('id').primaryKey(),
  stripeSessionId: varchar('stripe_session_id', { length: 255 })
    .notNull()
    .unique(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tableSeatId: integer('table_seat_id').references(() => tableSeats.id, {
    onDelete: 'cascade',
  }),
  busSeatId: integer('bus_seat_id').references(() => busSeats.id, {
    onDelete: 'cascade',
  }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type SeatReservation = typeof seatReservations.$inferSelect;
export type NewSeatReservation = typeof seatReservations.$inferInsert;
