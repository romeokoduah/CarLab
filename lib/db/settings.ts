import { getPool } from "@/lib/db/pool";
import { SITE_CONFIG } from "@/lib/config";
import type { Settings } from "@/lib/types";

interface SettingsRow {
  dealer_name: string;
  whatsapp_number: string;
  ghs_per_usd: string; // numeric -> string
  ghs_per_rmb: string | null;
}

function mapSettings(r: SettingsRow): Settings {
  return {
    dealerName: r.dealer_name,
    whatsappNumber: r.whatsapp_number,
    ghsPerUsd: Number(r.ghs_per_usd),
    ghsPerRmb: Number(r.ghs_per_rmb ?? SITE_CONFIG.ghsPerRmb),
  };
}

const DEFAULT_SETTINGS: Settings = {
  dealerName: SITE_CONFIG.dealerName,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  ghsPerUsd: SITE_CONFIG.ghsPerUsd,
  ghsPerRmb: SITE_CONFIG.ghsPerRmb,
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
    `INSERT INTO settings (id, dealer_name, whatsapp_number, ghs_per_usd, ghs_per_rmb)
     VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       dealer_name = EXCLUDED.dealer_name,
       whatsapp_number = EXCLUDED.whatsapp_number,
       ghs_per_usd = EXCLUDED.ghs_per_usd,
       ghs_per_rmb = EXCLUDED.ghs_per_rmb`,
    [next.dealerName, next.whatsappNumber, next.ghsPerUsd, next.ghsPerRmb],
  );
  return next;
}
