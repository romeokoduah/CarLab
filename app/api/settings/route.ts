import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await dbGetSettings();
  return NextResponse.json({ settings });
}
