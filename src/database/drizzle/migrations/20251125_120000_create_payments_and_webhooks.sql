-- Migration: create payments and stripe_webhooks tables and seed MacSync Test Event
-- Run with: pnpm --filter @teamd/database migrate (or drizzle-kit/migration tooling)

BEGIN;

-- Create payments table in team overlay
CREATE TABLE IF NOT EXISTS payments (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  event_id integer NOT NULL REFERENCES events(id),
  stripe_payment_intent_id varchar(255) NOT NULL,
  amount integer NOT NULL,
  currency varchar(10) DEFAULT 'cad',
  status varchar(50) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- Create stripe_webhooks table for debugging
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id serial PRIMARY KEY,
  event_id varchar(255) NOT NULL,
  payload json,
  processed boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Seed a test event for the MacSync payments POC (id = 1 preferred)
INSERT INTO events (id, name, date, location)
VALUES (1, 'MacSync Test Event', NOW() + INTERVAL '7 days', 'Test Location')
ON CONFLICT (id) DO NOTHING;

COMMIT;
