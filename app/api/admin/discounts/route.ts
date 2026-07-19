import { NextResponse } from "next/server";
import { dbCreateDiscount } from "@/lib/db/discounts";
import type { DiscountCode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const discount = await dbCreateDiscount(
    body as Omit<DiscountCode, "id" | "usedCount">,
  );
  return NextResponse.json({ discount }, { status: 201 });
}
