import { NextResponse } from "next/server";
import { dbGetSettings, dbUpdateSettings } from "@/lib/db/settings";
import { dbRepriceCarsForRates } from "@/lib/db/cars";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const before = await dbGetSettings();
  const settings = await dbUpdateSettings(body as Partial<Settings>);

  // An exchange-rate change moves the cedi price of every listing priced from
  // its RMB/USD cost breakdown, so re-price them here rather than leave the
  // public site quoting yesterday's rate.
  const ratesChanged =
    settings.ghsPerRmb !== before.ghsPerRmb ||
    settings.ghsPerUsd !== before.ghsPerUsd;
  const repriced = ratesChanged
    ? await dbRepriceCarsForRates({
        ghsPerRmb: settings.ghsPerRmb,
        ghsPerUsd: settings.ghsPerUsd,
      })
    : 0;

  return NextResponse.json({ settings, repriced });
}
