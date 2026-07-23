import { getPool } from "@/lib/db/pool";

/**
 * The dealer's own growing list of makes and models.
 *
 * Every car saved — by hand or by an import — adds its make/model here, so a
 * marque the built-in catalogue never heard of (a new Chinese EV brand, say)
 * becomes a dropdown option the next time. The admin form merges this with the
 * static catalogue in lib/data/vehicles.ts.
 */

export interface RegistryEntry {
  make: string;
  model: string;
}

/**
 * Add a make/model pair. Idempotent and case-insensitive — a second "Toyota"
 * / "corolla" does not create a duplicate row. Never throws into the caller's
 * path: registering a vehicle is a nice-to-have, not worth failing a car save.
 */
export async function dbRegisterVehicle(
  make: string,
  model: string,
): Promise<void> {
  const m = make.trim();
  const mo = model.trim();
  if (!m || !mo) return;
  try {
    await getPool().query(
      `INSERT INTO vehicle_registry (id, make, model)
       VALUES ('veh-' || md5(lower($1) || '|' || lower($2)), $1, $2)
       ON CONFLICT DO NOTHING`,
      [m, mo],
    );
  } catch (e) {
    console.error("vehicle registry insert failed (non-fatal):", e);
  }
}

/** Every registered make → its models, for the admin form's pickers. */
export async function dbGetRegistry(): Promise<{
  makes: string[];
  makeModels: Record<string, string[]>;
}> {
  const { rows } = await getPool().query<{ make: string; model: string }>(
    `SELECT make, model FROM vehicle_registry ORDER BY make, model`,
  );
  const makeModels: Record<string, string[]> = {};
  for (const r of rows) {
    (makeModels[r.make] ||= []).push(r.model);
  }
  return { makes: Object.keys(makeModels).sort(), makeModels };
}
