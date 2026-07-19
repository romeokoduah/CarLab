import { getPool } from "@/lib/db/pool";
import { SITE_CONFIG } from "@/lib/config";
import type { Settings } from "@/lib/types";

interface SettingsRow {
  dealer_name: string;
  whatsapp_number: string;
  ghs_per_usd: string; // numeric -> string
}

function mapSettings(r: SettingsRow): Settings {
  return {
    dealerName: r.dealer_name,
    whatsappNumber: r.whatsapp_number,
    ghsPerUsd: Number(r.ghs_per_usd),
  };
}

const DEFAULT_SETTINGS: Settings = {
  dealerName: SITE_CONFIG.dealerName,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  ghsPerUsd: SITE_CONFIG.ghsPerUsd,
};

export async function dbGetSettings(): Promise<Settings> {
  const { rows } = await getPool().query<SettingsRow>(
    `SELECT * FROM settings WHERE id = 1`,
  );
  return rows.length ? mapSettings(rows[0]) : DEFAULT_SETTINGS;
}

export async function dbUpdateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await dbGetSettings();
  const next = { ...current, ...patch };
  await getPool().query(
    `INSERT INTO settings (id, dealer_name, whatsapp_number, ghs_per_usd)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       dealer_name = EXCLUDED.dealer_name,
       whatsapp_number = EXCLUDED.whatsapp_number,
       ghs_per_usd = EXCLUDED.ghs_per_usd`,
    [next.dealerName, next.whatsappNumber, next.ghsPerUsd],
  );
  return next;
}
