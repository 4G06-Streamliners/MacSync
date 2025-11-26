DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signup_status') THEN
    CREATE TYPE "signup_status" AS ENUM ('pending', 'confirmed', 'waitlisted', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "bus_routes" (
  "id" serial PRIMARY KEY NOT NULL,
  "instance_id" integer NOT NULL REFERENCES "instances"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "description" text,
  "capacity" integer NOT NULL DEFAULT 0,
  "waitlist_capacity" integer NOT NULL DEFAULT 0,
  "departure_location" varchar(255),
  "departure_time" timestamptz,
  "signup_deadline" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "bus_routes_instance_idx" ON "bus_routes" ("instance_id");

CREATE TABLE IF NOT EXISTS "bus_signups" (
  "id" serial PRIMARY KEY NOT NULL,
  "instance_id" integer NOT NULL REFERENCES "instances"("id") ON DELETE cascade,
  "route_id" integer NOT NULL REFERENCES "bus_routes"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" "signup_status" NOT NULL DEFAULT 'pending',
  "waitlist_position" integer,
  "notes" text,
  "acted_by" integer REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "bus_signups_route_user_uniq" UNIQUE ("route_id","user_id")
);

CREATE INDEX IF NOT EXISTS "bus_signups_route_idx" ON "bus_signups" ("route_id");
CREATE INDEX IF NOT EXISTS "bus_signups_instance_idx" ON "bus_signups" ("instance_id");

CREATE TABLE IF NOT EXISTS "event_tables" (
  "id" serial PRIMARY KEY NOT NULL,
  "instance_id" integer NOT NULL REFERENCES "instances"("id") ON DELETE cascade,
  "label" varchar(120) NOT NULL,
  "capacity" integer NOT NULL DEFAULT 0,
  "location" varchar(255),
  "notes" text,
  "signup_deadline" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "event_tables_instance_label_uniq" UNIQUE ("instance_id","label")
);

CREATE INDEX IF NOT EXISTS "event_tables_instance_idx" ON "event_tables" ("instance_id");

CREATE TABLE IF NOT EXISTS "table_signups" (
  "id" serial PRIMARY KEY NOT NULL,
  "instance_id" integer NOT NULL REFERENCES "instances"("id") ON DELETE cascade,
  "table_id" integer NOT NULL REFERENCES "event_tables"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "group_name" varchar(255),
  "seats_requested" integer NOT NULL DEFAULT 1,
  "status" "signup_status" NOT NULL DEFAULT 'pending',
  "waitlist_position" integer,
  "notes" text,
  "acted_by" integer REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "table_signups_user_table_uniq" UNIQUE ("table_id","user_id")
);

CREATE INDEX IF NOT EXISTS "table_signups_table_idx" ON "table_signups" ("table_id");
CREATE INDEX IF NOT EXISTS "table_signups_instance_idx" ON "table_signups" ("instance_id");

CREATE TABLE IF NOT EXISTS "event_rsvps" (
  "id" serial PRIMARY KEY NOT NULL,
  "instance_id" integer NOT NULL REFERENCES "instances"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" "signup_status" NOT NULL DEFAULT 'pending',
  "waitlist_position" integer,
  "notes" text,
  "acted_by" integer REFERENCES "users"("id") ON DELETE set null,
  "responded_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "event_rsvps_instance_user_uniq" UNIQUE ("instance_id","user_id")
);

CREATE INDEX IF NOT EXISTS "event_rsvps_instance_idx" ON "event_rsvps" ("instance_id");

