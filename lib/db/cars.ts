import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { previewReprice, type Rates } from "@/lib/pricing";
import type { Car, CarImage } from "@/lib/types";

/** A `cars` row, with columns typed as the domain unions we always write. */
interface CarRow {
  id: string;
  make: string;
  model: string;
  year: number;
  price_ghs: string; // bigint -> string from pg
  mileage_km: number;
  transmission: Car["transmission"];
  fuel: Car["fuel"];
  body_type: Car["bodyType"];
  colour: string;
  condition: Car["condition"];
  description: string;
  features: string[] | null;
  video_url: string | null;
  status: Car["status"];
  verified: boolean;
  created_at: Date;
  engine_capacity: string | null;
  drivetrain: Car["drivetrain"] | null;
  seats: number | null;
  doors: number | null;
  cylinders: number | null;
  horsepower: number | null;
  previous_owners: number | null;
  registration_status: Car["registrationStatus"] | null;
  // numeric -> string from pg
  cost_car_rmb: string | null;
  cost_logistics_rmb: string | null;
  cost_profit_rmb: string | null;
  cost_shipping_usd: string | null;
  rate_ghs_per_rmb: string | null;
  rate_ghs_per_usd: string | null;
  cost_rates_pinned: boolean;
}

/** pg returns `numeric` as a string; keep NULL distinct from 0. */
function numOrUndef(v: string | null): number | undefined {
  return v == null ? undefined : Number(v);
}

interface ImageRow {
  id: string;
  car_id: string;
  url: string;
  position: number;
  alt: string | null;
}

function mapImage(r: ImageRow): CarImage {
  return { id: r.id, url: r.url, position: r.position, alt: r.alt ?? undefined };
}

function mapCar(r: CarRow, images: CarImage[]): Car {
  return {
    id: r.id,
    make: r.make,
    model: r.model,
    year: r.year,
    priceGhs: Number(r.price_ghs),
    mileageKm: r.mileage_km,
    transmission: r.transmission,
    fuel: r.fuel,
    bodyType: r.body_type,
    colour: r.colour,
    condition: r.condition,
    description: r.description,
    features: r.features ?? [],
    videoUrl: r.video_url ?? undefined,
    status: r.status,
    verified: r.verified,
    images: images.sort((a, b) => a.position - b.position),
    createdAt: r.created_at.toISOString(),
    engineCapacity: r.engine_capacity ?? undefined,
    drivetrain: r.drivetrain ?? undefined,
    seats: r.seats ?? undefined,
    doors: r.doors ?? undefined,
    cylinders: r.cylinders ?? undefined,
    horsepower: r.horsepower ?? undefined,
    previousOwners: r.previous_owners ?? undefined,
    registrationStatus: r.registration_status ?? undefined,
    costCarRmb: numOrUndef(r.cost_car_rmb),
    costLogisticsRmb: numOrUndef(r.cost_logistics_rmb),
    costProfitRmb: numOrUndef(r.cost_profit_rmb),
    costShippingUsd: numOrUndef(r.cost_shipping_usd),
    rateGhsPerRmb: numOrUndef(r.rate_ghs_per_rmb),
    rateGhsPerUsd: numOrUndef(r.rate_ghs_per_usd),
    ratesPinned: r.cost_rates_pinned,
  };
}

async function replaceImages(carId: string, images: CarImage[]): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM car_images WHERE car_id = $1`, [carId]);
  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    // Always mint a fresh image id so duplicating a car (or re-saving) can never
    // collide on the car_images primary key.
    await pool.query(
      `INSERT INTO car_images (id, car_id, url, position, alt)
       VALUES ($1,$2,$3,$4,$5)`,
      [`img-${randomUUID()}`, carId, im.url, i, im.alt ?? null],
    );
  }
}

const CAR_COLUMNS = `make=$2, model=$3, year=$4, price_ghs=$5, mileage_km=$6,
  transmission=$7, fuel=$8, body_type=$9, colour=$10, condition=$11,
  description=$12, features=$13, video_url=$14, status=$15, verified=$16,
  engine_capacity=$17, drivetrain=$18, seats=$19, doors=$20, cylinders=$21,
  horsepower=$22, previous_owners=$23, registration_status=$24,
  cost_car_rmb=$25, cost_logistics_rmb=$26, cost_profit_rmb=$27,
  cost_shipping_usd=$28, rate_ghs_per_rmb=$29, rate_ghs_per_usd=$30,
  cost_rates_pinned=$31`;

function carValues(id: string, c: Omit<Car, "id" | "createdAt" | "images">) {
  return [
    id, c.make, c.model, c.year, c.priceGhs, c.mileageKm, c.transmission,
    c.fuel, c.bodyType, c.colour, c.condition, c.description, c.features,
    c.videoUrl ?? null, c.status, c.verified, c.engineCapacity ?? null,
    c.drivetrain ?? null, c.seats ?? null, c.doors ?? null, c.cylinders ?? null,
    c.horsepower ?? null, c.previousOwners ?? null, c.registrationStatus ?? null,
    c.costCarRmb ?? null, c.costLogisticsRmb ?? null, c.costProfitRmb ?? null,
    c.costShippingUsd ?? null, c.rateGhsPerRmb ?? null, c.rateGhsPerUsd ?? null,
    c.ratesPinned ?? false,
  ];
}

export async function dbGetCars(): Promise<Car[]> {
  const pool = getPool();
  const cars = await pool.query<CarRow>(`SELECT * FROM cars ORDER BY created_at DESC`);
  const imgs = await pool.query<ImageRow>(`SELECT * FROM car_images`);
  const byCar = new Map<string, CarImage[]>();
  for (const r of imgs.rows) {
    const list = byCar.get(r.car_id) ?? [];
    list.push(mapImage(r));
    byCar.set(r.car_id, list);
  }
  return cars.rows.map((r) => mapCar(r, byCar.get(r.id) ?? []));
}

export async function dbGetCarById(id: string): Promise<Car | undefined> {
  const pool = getPool();
  const car = await pool.query<CarRow>(`SELECT * FROM cars WHERE id = $1`, [id]);
  if (car.rows.length === 0) return undefined;
  const imgs = await pool.query<ImageRow>(
    `SELECT * FROM car_images WHERE car_id = $1 ORDER BY position`,
    [id],
  );
  return mapCar(car.rows[0], imgs.rows.map(mapImage));
}

export async function dbCreateCar(
  input: Omit<Car, "id" | "createdAt">,
): Promise<Car> {
  const pool = getPool();
  const id = `car-${randomUUID()}`;
  await pool.query(
    `INSERT INTO cars (id, make, model, year, price_ghs, mileage_km,
       transmission, fuel, body_type, colour, condition, description, features,
       video_url, status, verified, engine_capacity, drivetrain, seats, doors,
       cylinders, horsepower, previous_owners, registration_status,
       cost_car_rmb, cost_logistics_rmb, cost_profit_rmb, cost_shipping_usd,
       rate_ghs_per_rmb, rate_ghs_per_usd, cost_rates_pinned)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
       $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)`,
    carValues(id, input),
  );
  await replaceImages(id, input.images ?? []);
  return (await dbGetCarById(id))!;
}

export async function dbUpdateCar(
  id: string,
  patch: Partial<Car>,
): Promise<Car | undefined> {
  const existing = await dbGetCarById(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch };
  await getPool().query(
    `UPDATE cars SET ${CAR_COLUMNS} WHERE id = $1`,
    carValues(id, merged),
  );
  if (patch.images) await replaceImages(id, patch.images);
  return dbGetCarById(id);
}

export async function dbDeleteCar(id: string): Promise<void> {
  await getPool().query(`DELETE FROM cars WHERE id = $1`, [id]);
}

/**
 * Re-price every listing that follows the global exchange rates, and record
 * the rates it was priced at. Hand-priced and rate-pinned listings are
 * untouched. Returns the number of cars whose price actually moved.
 *
 * Called whenever the Settings rates change, so the cedi price buyers see is
 * always the current cost of the car. See lib/pricing.ts for the rules.
 */
export async function dbRepriceCarsForRates(rates: Rates): Promise<number> {
  const cars = await dbGetCars();
  const rows = previewReprice(cars, rates);
  const pool = getPool();
  for (const row of rows) {
    await pool.query(
      `UPDATE cars
          SET price_ghs = $2, rate_ghs_per_rmb = $3, rate_ghs_per_usd = $4
        WHERE id = $1`,
      [row.id, row.newPriceGhs, rates.ghsPerRmb, rates.ghsPerUsd],
    );
  }
  // Cars that follow the rates but whose rounded price did not move still need
  // their stored rates refreshed, so the breakdown reopens with today's rates.
  await pool.query(
    `UPDATE cars
        SET rate_ghs_per_rmb = $1, rate_ghs_per_usd = $2
      WHERE cost_rates_pinned = false AND cost_car_rmb IS NOT NULL`,
    [rates.ghsPerRmb, rates.ghsPerUsd],
  );
  return rows.length;
}
