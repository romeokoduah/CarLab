import { NextResponse } from "next/server";
import { dbVoidReceipt } from "@/lib/db/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Void a receipt. There is no DELETE here on purpose — a receipt that was
 * handed to a customer stays on file, marked void, with its number used up.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  if (body?.status !== "void") {
    return NextResponse.json(
      { error: "A receipt can only be voided." },
      { status: 400 },
    );
  }
  const receipt = await dbVoidReceipt(
    params.id,
    typeof body.reason === "string" ? body.reason : null,
  );
  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ receipt });
}
