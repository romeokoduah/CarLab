import { getPool } from "@/lib/db/pool";
import { DEFAULT_DUTY_CONFIG, type DutyConfig } from "@/lib/duty";

interface DutyConfigRow {
  config: DutyConfig;
}

/**
 * The duty rate table. Falls back to the bundled defaults if the row is missing
 * so the calculator never breaks; stored values are merged over the defaults so
 * a partial/older row still yields a complete config.
 */
export async function dbGetDutyConfig(): Promise<DutyConfig> {
  const { rows } = await getPool().query<DutyConfigRow>(
    `SELECT config FROM duty_config WHERE id = 1`,
  );
  if (rows.length === 0) return DEFAULT_DUTY_CONFIG;
  return {
    ...DEFAULT_DUTY_CONFIG,
    ...rows[0].config,
    levies: { ...DEFAULT_DUTY_CONFIG.levies, ...rows[0].config?.levies },
  };
}

export async function dbUpdateDutyConfig(
  patch: Partial<DutyConfig>,
): Promise<DutyConfig> {
  const current = await dbGetDutyConfig();
  const next: DutyConfig = {
    ...current,
    ...patch,
    levies: { ...current.levies, ...patch.levies },
  };
  await getPool().query(
    `INSERT INTO duty_config (id, config, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = now()`,
    [JSON.stringify(next)],
  );
  return next;
}
