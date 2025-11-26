import { pgTable, serial, text, varchar, boolean, timestamp, integer, json } from "drizzle-orm/pg-core";

// ------------------- USER PROFILE -------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ------------------- EVENTS -------------------
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ------------------- ATTENDEES (USER-EVENT CONNECTION) -------------------
export const attendees = pgTable("attendees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),

  // Snapshot of user info at registration
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  dietaryRestrictions: text("dietary_restrictions"),
  program: varchar("program", { length: 255 }),
  year: varchar("year", { length: 50 }),

  waiverSigned: boolean("waiver_signed").default(false),
  checkedIn: boolean("checked_in").default(false), // true once QR is scanned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ------------------- QR CODES -------------------
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  attendeeId: integer("attendee_id").notNull().references(() => attendees.id),
  createdAt: timestamp("created_at").defaultNow(),
  checkedInAt: timestamp("checked_in_at"), // records scan time
});

// ------------------- NOTIFICATIONS -------------------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id),
  message: text("message").notNull(),
  recipients: json("recipients"), // can store array of attendeeIds or emails
  createdAt: timestamp("created_at").defaultNow(),
});
