import type { Car, DiscountCode } from "@/lib/types";
import { dbGetCars, dbGetCarById } from "@/lib/db/cars";
import { dbGetDiscounts } from "@/lib/db/discounts";

/**
 * Server-side data-access boundary. Backed by PostgreSQL (lib/db/*). Used by
 * server components and route handlers. Client components read cached data from
 * lib/store.ts, which hydrates from the /api/* routes that call these.
 *
 * IMPORTANT: server-only (imports `pg`). Never import from a client component.
 */

export async function getCars(): Promise<Car[]> {
  return dbGetCars();
}

export async function getCarById(id: string): Promise<Car | undefined> {
  return dbGetCarById(id);
}

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  return dbGetDiscounts();
}
