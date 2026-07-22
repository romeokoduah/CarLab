import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth-server";
import { dbCreateReceipt, dbListReceipts } from "@/lib/db/receipts";
import { validateAmounts } from "@/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ receipts: await dbListReceipts() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const customerName = String(body.customerName ?? "").trim();
  const vehicleLabel = String(body.vehicleLabel ?? "").trim();
  if (customerName.length < 2) {
    return NextResponse.json(
      { error: "Enter the customer's name." },
      { status: 400 },
    );
  }
  if (!vehicleLabel) {
    return NextResponse.json(
      { error: "Enter the vehicle this receipt is for." },
      { status: 400 },
    );
  }

  const priceGhs = Number(body.priceGhs);
  const amountPaidGhs = Number(body.amountPaidGhs);
  const invalid = validateAmounts({ priceGhs, amountPaidGhs });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Recorded so a receipt can always be traced back to who issued it.
  const admin = await currentAdmin();

  const receipt = await dbCreateReceipt({
    carId: typeof body.carId === "string" && body.carId ? body.carId : null,
    leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : null,
    customerName,
    customerPhone: String(body.customerPhone ?? ""),
    customerEmail: String(body.customerEmail ?? ""),
    vehicleLabel,
    vehicleDetails: String(body.vehicleDetails ?? ""),
    vin: String(body.vin ?? ""),
    priceGhs,
    amountPaidGhs,
    paymentMethod: String(body.paymentMethod ?? ""),
    paymentRef: String(body.paymentRef ?? ""),
    notes: String(body.notes ?? ""),
    issuedBy: admin?.email ?? null,
  });

  return NextResponse.json({ receipt }, { status: 201 });
}
