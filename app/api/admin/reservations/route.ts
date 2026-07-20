import { NextResponse } from "next/server";
import {
  dbCreateReservation,
  dbListReservations,
} from "@/lib/db/reservations";
import { dbGetLeadByReference } from "@/lib/db/leads";
import { normalizeReference } from "@/lib/reference";
import { currentAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const reservations = await dbListReservations();
  return NextResponse.json({ reservations });
}

/** Reserve a car against a customer reference. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const carId = String(body?.carId ?? "");
  const reference = normalizeReference(String(body?.reference ?? ""));
  const holdDays = Number(body?.holdDays) > 0 ? Number(body.holdDays) : 3;
  const note = typeof body?.note === "string" ? body.note : null;

  if (!carId) {
    return NextResponse.json({ error: "Choose a car." }, { status: 400 });
  }
  if (!reference) {
    return NextResponse.json(
      { error: "That doesn't look like a valid reference." },
      { status: 400 },
    );
  }

  const lead = await dbGetLeadByReference(reference);
  if (!lead) {
    return NextResponse.json(
      { error: "No customer found with that reference." },
      { status: 404 },
    );
  }

  const session = await currentAdmin();
  const reservation = await dbCreateReservation({
    carId,
    leadId: lead.id,
    adminEmail: session?.email ?? null,
    note,
    holdDays,
  });
  return NextResponse.json({ reservation }, { status: 201 });
}
