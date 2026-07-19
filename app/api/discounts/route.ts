import { NextResponse } from "next/server";
import { getDiscountCodes } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const discounts = await getDiscountCodes();
  return NextResponse.json({ discounts });
}
