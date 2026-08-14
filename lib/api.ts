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

/**
 * Strip the landed-cost breakdown before a car leaves the server for a public
 * page or the public API.
 *
 * The breakdown holds what the dealer paid in China and the margin taken on the
 * car. It is admin-only commercial data: it must never appear in /api/cars, in
 * a server-rendered page's payload, or anywhere else a buyer or competitor can
 * read it. The admin UI gets the full record from /api/admin/cars instead.
 */
export function toPublicCar(car: Car): Car {
  const {
    costCarRmb: _a,
    costLogisticsRmb: _b,
    costProfitRmb: _c,
    costShippingUsd: _d,
    rateGhsPerRmb: _e,
    rateGhsPerUsd: _f,
    ratesPinned: _g,
    sourceUrl: _h,
    ...publicFields
  } = car;
  return publicFields;
}

export async function getCars(): Promise<Car[]> {
  return (await dbGetCars()).map(toPublicCar);
}

/**
 * Non-throwing variant of getCars, for the public marketing pages.
 *
 * Those pages are `force-dynamic` and awaited getCars() directly, so ANY
 * database fault — an unreachable server, a missing DATABASE_URL, a schema that
 * was never migrated — threw during render and Next replaced the whole page
 * with "Application error: a server-side exception has occurred". A visitor
 * could not read the phone number, reach WhatsApp, or see that the dealer
 * exists, all because one query failed.
 *
 * A car dealer's homepage has no business dying alongside its database. This
 * returns an empty inventory and a `degraded` flag instead, so the page still
 * renders while the operator still finds the real error in the logs.
 *
 * Deliberately NOT used by the admin screens or the /api routes: there a
 * database failure must surface loudly rather than masquerade as "no cars".
 */
export async function getCarsSafe(): Promise<{ cars: Car[]; degraded: boolean }> {
  try {
    return { cars: await getCars(), degraded: false };
  } catch (error) {
    console.error(
      "[eclipse-motors] getCars() failed; serving the page without inventory.",
      error,
    );
    return { cars: [], degraded: true };
  }
}

export async function getCarById(id: string): Promise<Car | undefined> {
  const car = await dbGetCarById(id);
  return car && toPublicCar(car);
}

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  return dbGetDiscounts();
}
