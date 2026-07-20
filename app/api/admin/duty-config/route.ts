import { NextResponse } from "next/server";
import { dbUpdateDutyConfig } from "@/lib/db/duty";
import type { DutyConfig } from "@/lib/duty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const config = await dbUpdateDutyConfig(body as Partial<DutyConfig>);
  return NextResponse.json({ config });
}
