import { NextResponse } from "next/server";
import { getCars } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cars = await getCars();
  return NextResponse.json({ cars });
}
