import { NextResponse } from "next/server";
import { dbUpdateDiscount, dbDeleteDiscount } from "@/lib/db/discounts";
import type { DiscountCode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const discount = await dbUpdateDiscount(
    params.id,
    body as Partial<DiscountCode>,
  );
  if (!discount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ discount });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await dbDeleteDiscount(params.id);
  return NextResponse.json({ ok: true });
}
