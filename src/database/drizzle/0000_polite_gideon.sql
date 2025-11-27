BEGIN;

-- ============================
-- USERS
-- ============================
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  is_system_admin boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ============================
-- ORGANIZATIONS
-- ============================
CREATE TABLE IF NOT EXISTS organizations (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  acronym varchar(50),
  created_at timestamp DEFAULT now()
);

-- ============================
-- INSTANCES
-- ============================
CREATE TABLE IF NOT EXISTS instances (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  owner_organization_id integer NOT NULL REFERENCES organizations(id),
  created_at timestamp DEFAULT now()
);

-- ============================
-- USER → ORGANIZATION MEMBERSHIP
-- ============================
CREATE TABLE IF NOT EXISTS user_organizations (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  organization_id integer NOT NULL REFERENCES organizations(id),
  is_organization_admin boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- ============================
-- USER → INSTANCE ACCESS
-- ============================
CREATE TABLE IF NOT EXISTS user_instance_access (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  instance_id integer NOT NULL REFERENCES instances(id),
  access_level varchar(50) NOT NULL,
  granted_by integer REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

-- ============================
-- EVENTS
-- ============================
CREATE TABLE IF NOT EXISTS events (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  date timestamp NOT NULL,
  location varchar(255),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ============================
-- ATTENDEES
-- ============================
CREATE TABLE IF NOT EXISTS attendees (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  user_id integer REFERENCES users(id),
  event_id integer REFERENCES events(id),
  email varchar(255),
  phone_number varchar(50),
  dietary_restrictions text,
  program varchar(255),
  year varchar(50),
  waiver_signed boolean DEFAULT false,
  checked_in boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ============================
-- QR CODES
-- ============================
CREATE TABLE IF NOT EXISTS qr_codes (
  id serial PRIMARY KEY,
  code varchar(255) UNIQUE NOT NULL,
  attendee_id integer NOT NULL REFERENCES attendees(id),
  created_at timestamp DEFAULT now(),
  checked_in_at timestamp
);

-- ============================
-- NOTIFICATIONS
-- ============================
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  event_id integer REFERENCES events(id),
  message text NOT NULL,
  recipients json,
  created_at timestamp DEFAULT now()
);

-- ============================
-- PAYMENTS (Team D)
-- ============================
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

-- ============================
-- STRIPE WEBHOOKS
-- ============================
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id serial PRIMARY KEY,
  event_id varchar(255) NOT NULL,
  payload json,
  processed boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Seed Test Event (ID = 1)
INSERT INTO events (id, name, date, location)
VALUES (1, 'MacSync Test Event', NOW(), 'Test Hall')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name, is_system_admin)
VALUES (1, 'abyanjaigirdar@hotmail.com', 'Abyan Jaigirdar', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
