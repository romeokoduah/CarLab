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

CREATE TABLE IF NOT EXISTS admin_users (
  id            text PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
