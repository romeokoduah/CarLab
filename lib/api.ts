import type { Car, DiscountCode } from "@/lib/types";
import { SEED_CARS, SEED_DISCOUNTS } from "@/lib/data/seed";

/**
 * Data-access boundary.
 *
 * This module is the single seam between the UI and the backend. Today it reads
 * from bundled seed data (used for server-side metadata and static params). The
 * interactive app reads/writes through the client store in lib/store.ts, which
 * is seeded from the same source.
 *
 * To adopt Supabase (or a FastAPI + PostgreSQL service), implement these
 * functions against your API and point lib/store.ts's actions at them. No UI
 * component imports the backend directly — they all go through this seam.
 */

export async function getCars(): Promise<Car[]> {
  return SEED_CARS;
}

export async function getCarById(id: string): Promise<Car | undefined> {
  return SEED_CARS.find((c) => c.id === id);
}

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  return SEED_DISCOUNTS;
}

/** All car ids — used by generateStaticParams for the detail route. */
export function getAllCarIds(): string[] {
  return SEED_CARS.map((c) => c.id);
}
