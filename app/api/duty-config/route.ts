import { NextResponse } from "next/server";
import { dbGetDutyConfig } from "@/lib/db/duty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await dbGetDutyConfig();
  return NextResponse.json({ config });
}
