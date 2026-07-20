import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db/pool";
import { SEED_CARS, SEED_DISCOUNTS } from "@/lib/data/seed";
import { SITE_CONFIG } from "@/lib/config";
import { DEFAULT_DUTY_CONFIG } from "@/lib/duty";

/**
 * Idempotent migration + first-run seed. Safe to run on every deploy:
 *  - applies schema.sql (CREATE TABLE IF NOT EXISTS ...)
 *  - seeds cars/discounts/settings from bundled data ONLY if their table is empty
 *  - creates the bootstrap admin from ADMIN_EMAIL/ADMIN_PASSWORD if none exists
 */
async function count(table: string): Promise<number> {
  const { rows } = await getPool().query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n as number;
}

export async function migrate(): Promise<void> {
  const pool = getPool();

  const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);

  if ((await count("cars")) === 0) {
    for (const c of SEED_CARS) {
      await pool.query(
        `INSERT INTO cars (id, make, model, year, price_ghs, mileage_km,
           transmission, fuel, body_type, colour, condition, description,
           features, video_url, status, verified, created_at, engine_capacity,
           drivetrain, seats, doors, cylinders, horsepower, previous_owners,
           registration_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
           $18,$19,$20,$21,$22,$23,$24,$25)`,
        [
          c.id, c.make, c.model, c.year, c.priceGhs, c.mileageKm,
          c.transmission, c.fuel, c.bodyType, c.colour, c.condition,
          c.description, c.features, c.videoUrl ?? null, c.status, c.verified,
          c.createdAt, c.engineCapacity ?? null, c.drivetrain ?? null,
          c.seats ?? null, c.doors ?? null, c.cylinders ?? null,
          c.horsepower ?? null, c.previousOwners ?? null,
          c.registrationStatus ?? null,
        ],
      );
      for (const im of c.images) {
        await pool.query(
          `INSERT INTO car_images (id, car_id, url, position, alt)
           VALUES ($1,$2,$3,$4,$5)`,
          [im.id, c.id, im.url, im.position, im.alt ?? null],
        );
      }
    }
    console.log(`seeded ${SEED_CARS.length} cars`);
  }

  if ((await count("discounts")) === 0) {
    for (const d of SEED_DISCOUNTS) {
      await pool.query(
        `INSERT INTO discounts (id, code, type, value, min_price, expires_at,
           usage_limit, used_count, make_restriction, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          d.id, d.code, d.type, d.value, d.minPrice ?? null,
          d.expiresAt ?? null, d.usageLimit ?? null, d.usedCount,
          d.makeRestriction ?? null, d.active,
        ],
      );
    }
    console.log(`seeded ${SEED_DISCOUNTS.length} discounts`);
  }

  if ((await count("settings")) === 0) {
    await pool.query(
      `INSERT INTO settings (id, dealer_name, whatsapp_number, ghs_per_usd)
       VALUES (1, $1, $2, $3)`,
      [SITE_CONFIG.dealerName, SITE_CONFIG.whatsappNumber, SITE_CONFIG.ghsPerUsd],
    );
    console.log("seeded settings");
  }

  if ((await count("duty_config")) === 0) {
    await pool.query(
      `INSERT INTO duty_config (id, config) VALUES (1, $1)`,
      [JSON.stringify(DEFAULT_DUTY_CONFIG)],
    );
    console.log("seeded duty config");
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if ((await count("admin_users")) === 0 && email && password) {
    await pool.query(
      `INSERT INTO admin_users (id, email, password_hash) VALUES ($1, $2, $3)`,
      [`admin-${randomUUID()}`, email, bcrypt.hashSync(password, 10)],
    );
    console.log(`created admin ${email}`);
  }
}

// Allow running directly: `npm run db:migrate`
migrate()
  .then(() => {
    console.log("migration complete");
    return getPool().end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("migration failed:", err);
    process.exit(1);
  });
