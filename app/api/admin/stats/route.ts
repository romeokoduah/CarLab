import { NextResponse } from "next/server";
import { dbGetStats } from "@/lib/db/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("days"));
  const days = raw === 7 || raw === 30 || raw === 90 ? raw : 30;
  const stats = await dbGetStats(days);
  return NextResponse.json({ stats });
}
