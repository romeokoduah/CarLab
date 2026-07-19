import { NextResponse } from "next/server";
import { dbUpdateSettings } from "@/lib/db/settings";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const settings = await dbUpdateSettings(body as Partial<Settings>);
  return NextResponse.json({ settings });
}
