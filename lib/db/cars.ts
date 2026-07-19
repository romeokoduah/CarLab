import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
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
  };
}

async function replaceImages(carId: string, images: CarImage[]): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM car_images WHERE car_id = $1`, [carId]);
  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    await pool.query(
      `INSERT INTO car_images (id, car_id, url, position, alt)
       VALUES ($1,$2,$3,$4,$5)`,
      [im.id || `img-${randomUUID()}`, carId, im.url, i, im.alt ?? null],
    );
  }
}

const CAR_COLUMNS = `make=$2, model=$3, year=$4, price_ghs=$5, mileage_km=$6,
  transmission=$7, fuel=$8, body_type=$9, colour=$10, condition=$11,
  description=$12, features=$13, video_url=$14, status=$15, verified=$16,
  engine_capacity=$17, drivetrain=$18, seats=$19, doors=$20, cylinders=$21,
  horsepower=$22, previous_owners=$23, registration_status=$24`;

function carValues(id: string, c: Omit<Car, "id" | "createdAt" | "images">) {
  return [
    id, c.make, c.model, c.year, c.priceGhs, c.mileageKm, c.transmission,
    c.fuel, c.bodyType, c.colour, c.condition, c.description, c.features,
    c.videoUrl ?? null, c.status, c.verified, c.engineCapacity ?? null,
    c.drivetrain ?? null, c.seats ?? null, c.doors ?? null, c.cylinders ?? null,
    c.horsepower ?? null, c.previousOwners ?? null, c.registrationStatus ?? null,
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
       cylinders, horsepower, previous_owners, registration_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
       $19,$20,$21,$22,$23,$24)`,
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
