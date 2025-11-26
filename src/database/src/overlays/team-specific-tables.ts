/**
 * Team D Specific Tables
 *
 * Defines signup-related tables that extend the shared Large Event schema.
 * These tables power the bus, table, and RSVP flows described in the MIS.
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { instances, users } from '@large-event/database/schemas';

/**
 * Shared signup status enum used across bus/table/RSVP flows.
 */
export const signupStatusEnum = pgEnum('signup_status', ['pending', 'confirmed', 'waitlisted', 'cancelled']);

/**
 * Bus routes that belong to a specific event instance.
 */
export const busRoutes = pgTable(
  'bus_routes',
  {
    id: serial('id').primaryKey(),
    instanceId: integer('instance_id')
      .notNull()
      .references(() => instances.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    capacity: integer('capacity').notNull().default(0),
    waitlistCapacity: integer('waitlist_capacity').notNull().default(0),
    departureLocation: varchar('departure_location', { length: 255 }),
    departureTime: timestamp('departure_time', { withTimezone: true }),
    signupDeadline: timestamp('signup_deadline', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    instanceIdx: index('bus_routes_instance_idx').on(table.instanceId),
  })
);

/**
 * Individual bus signups.
 */
export const busSignups = pgTable(
  'bus_signups',
  {
    id: serial('id').primaryKey(),
    instanceId: integer('instance_id')
      .notNull()
      .references(() => instances.id, { onDelete: 'cascade' }),
    routeId: integer('route_id')
      .notNull()
      .references(() => busRoutes.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: signupStatusEnum('status').notNull().default('pending'),
    waitlistPosition: integer('waitlist_position'),
    notes: text('notes'),
    actedBy: integer('acted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    routeUserUnique: uniqueIndex('bus_signups_route_user_uniq').on(table.routeId, table.userId),
    routeIdx: index('bus_signups_route_idx').on(table.routeId),
    instanceIdx: index('bus_signups_instance_idx').on(table.instanceId),
  })
);

/**
 * Table configurations for seated events.
 */
export const eventTables = pgTable(
  'event_tables',
  {
    id: serial('id').primaryKey(),
    instanceId: integer('instance_id')
      .notNull()
      .references(() => instances.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }).notNull(),
    capacity: integer('capacity').notNull().default(0),
    location: varchar('location', { length: 255 }),
    notes: text('notes'),
    signupDeadline: timestamp('signup_deadline', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    instanceIdx: index('event_tables_instance_idx').on(table.instanceId),
    labelUnique: uniqueIndex('event_tables_instance_label_uniq').on(table.instanceId, table.label),
  })
);

/**
 * Table signups capture party/group seating information.
 */
export const tableSignups = pgTable(
  'table_signups',
  {
    id: serial('id').primaryKey(),
    instanceId: integer('instance_id')
      .notNull()
      .references(() => instances.id, { onDelete: 'cascade' }),
    tableId: integer('table_id')
      .notNull()
      .references(() => eventTables.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupName: varchar('group_name', { length: 255 }),
    seatsRequested: integer('seats_requested').notNull().default(1),
    status: signupStatusEnum('status').notNull().default('pending'),
    waitlistPosition: integer('waitlist_position'),
    notes: text('notes'),
    actedBy: integer('acted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tableIdx: index('table_signups_table_idx').on(table.tableId),
    instanceIdx: index('table_signups_instance_idx').on(table.instanceId),
    uniqueSignup: uniqueIndex('table_signups_user_table_uniq').on(table.tableId, table.userId),
  })
);

/**
 * RSVP submissions for an event instance.
 */
export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: serial('id').primaryKey(),
    instanceId: integer('instance_id')
      .notNull()
      .references(() => instances.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: signupStatusEnum('status').notNull().default('pending'),
    waitlistPosition: integer('waitlist_position'),
    notes: text('notes'),
    actedBy: integer('acted_by').references(() => users.id, { onDelete: 'set null' }),
    respondedAt: timestamp('responded_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSignup: uniqueIndex('event_rsvps_instance_user_uniq').on(table.instanceId, table.userId),
    instanceIdx: index('event_rsvps_instance_idx').on(table.instanceId),
  })
);

/**
 * Convenience re-export of shared types for downstream packages.
 */
export type BusRoute = typeof busRoutes.$inferSelect;
export type NewBusRoute = typeof busRoutes.$inferInsert;

export type BusSignup = typeof busSignups.$inferSelect;
export type NewBusSignup = typeof busSignups.$inferInsert;

export type EventTable = typeof eventTables.$inferSelect;
export type NewEventTable = typeof eventTables.$inferInsert;

export type TableSignup = typeof tableSignups.$inferSelect;
export type NewTableSignup = typeof tableSignups.$inferInsert;

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;