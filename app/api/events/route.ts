import { NextResponse } from "next/server";
import { dbRecordEvent } from "@/lib/db/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Anonymous interest tracking. Called from the browser, so crawlers (which
 * don't run JS) stay out of the numbers. `sessionKey` is a random token from
 * the visitor's browser — no IP address or fingerprint is recorded.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const carId = typeof body?.carId === "string" ? body.carId : null;
  const type = body?.type === "favourite" ? "favourite" : "view";
  const sessionKey =
    typeof body?.sessionKey === "string" ? body.sessionKey.slice(0, 64) : null;

  if (!carId) {
    return NextResponse.json({ error: "carId required" }, { status: 400 });
  }

  try {
    await dbRecordEvent(carId, type, sessionKey);
  } catch {
    // Never let analytics break the page.
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
