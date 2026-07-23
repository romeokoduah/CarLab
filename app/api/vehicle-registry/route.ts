import { NextResponse } from "next/server";
import { dbGetRegistry } from "@/lib/db/vehicle-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The dealer's registered makes/models. Not sensitive (it is just brand and
 * model names), and the admin form needs it to offer previously-added
 * vehicles as options, so it is served alongside the other public data.
 */
export async function GET() {
  return NextResponse.json(await dbGetRegistry());
}
