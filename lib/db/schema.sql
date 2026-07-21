-- Eclipse Motors schema. Idempotent: safe to run on every deploy.

CREATE TABLE IF NOT EXISTS cars (
  id                  text PRIMARY KEY,
  make                text NOT NULL,
  model               text NOT NULL,
  year                int  NOT NULL,
  price_ghs           bigint NOT NULL,
  mileage_km          int  NOT NULL,
  transmission        text NOT NULL,
  fuel                text NOT NULL,
  body_type           text NOT NULL,
  colour              text NOT NULL,
  condition           text NOT NULL,
  description         text NOT NULL DEFAULT '',
  features            text[] NOT NULL DEFAULT '{}',
  video_url           text,
  status              text NOT NULL DEFAULT 'Available',
  verified            boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  engine_capacity     text,
  drivetrain          text,
  seats               int,
  doors               int,
  cylinders           int,
  horsepower          int,
  previous_owners     int,
  registration_status text
);

-- Landed-cost breakdown. Nullable: listings priced by hand (and everything
-- created before this feature) simply have no breakdown.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cost_car_rmb       numeric;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cost_logistics_rmb numeric;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cost_profit_rmb    numeric;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cost_shipping_usd  numeric;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS rate_ghs_per_rmb   numeric;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS rate_ghs_per_usd   numeric;

CREATE TABLE IF NOT EXISTS car_images (
  id       text PRIMARY KEY,
  car_id   text NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  url      text NOT NULL,
  position int  NOT NULL DEFAULT 0,
  alt      text
);
CREATE INDEX IF NOT EXISTS idx_car_images_car ON car_images(car_id);

CREATE TABLE IF NOT EXISTS discounts (
  id               text PRIMARY KEY,
  code             text NOT NULL,
  type             text NOT NULL,
  value            numeric NOT NULL,
  min_price        bigint,
  expires_at       timestamptz,
  usage_limit      int,
  used_count       int NOT NULL DEFAULT 0,
  make_restriction text,
  active           boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS settings (
  id             int PRIMARY KEY DEFAULT 1,
  dealer_name    text NOT NULL,
  whatsapp_number text NOT NULL,
  ghs_per_usd    numeric NOT NULL,
  CONSTRAINT settings_singleton CHECK (id = 1)
);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ghs_per_rmb numeric NOT NULL DEFAULT 2.1;

-- Import-duty rate table (single row). Editable from the admin so rates can be
-- updated each national budget without a code change.
CREATE TABLE IF NOT EXISTS duty_config (
  id         int PRIMARY KEY DEFAULT 1,
  config     jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duty_config_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            text PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ── Customer leads ─────────────────────────────────────────────────────────
-- Personal data. Only ever exposed through the authenticated admin API; the
-- public lookup endpoint returns a first name only. No IP addresses are kept.
CREATE TABLE IF NOT EXISTS leads (
  id           text PRIMARY KEY,
  reference    text UNIQUE NOT NULL,
  full_name    text NOT NULL,
  phone        text NOT NULL,
  email        text,
  consent      boolean NOT NULL DEFAULT false,
  consent_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id         text PRIMARY KEY,
  lead_id    text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  car_id     text REFERENCES cars(id) ON DELETE SET NULL,
  channel    text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_lead ON enquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_car ON enquiries(car_id);

-- Anonymous interest events. `session_key` is a random browser token, NOT an
-- IP address or fingerprint — enough to de-duplicate, not to identify.
CREATE TABLE IF NOT EXISTS events (
  id          text PRIMARY KEY,
  car_id      text REFERENCES cars(id) ON DELETE CASCADE,
  type        text NOT NULL,
  session_key text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_car_type ON events(car_id, type, created_at);

CREATE TABLE IF NOT EXISTS reservations (
  id          text PRIMARY KEY,
  car_id      text NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  admin_email text,
  note        text,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reservations_car ON reservations(car_id, status);
