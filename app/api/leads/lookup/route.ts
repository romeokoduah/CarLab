import { NextResponse } from "next/server";
import { dbGetLeadByReference, dbRecordEnquiry } from "@/lib/db/leads";
import { normalizeReference } from "@/lib/reference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirm a returning customer's reference and log their enquiry.
 *
 * PRIVACY: deliberately returns ONLY a first name. Returning the full profile
 * would let anyone harvest customer details by guessing references.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const reference = normalizeReference(String(body?.reference ?? ""));
  const carId = typeof body?.carId === "string" ? body.carId : null;

  if (!reference) {
    return NextResponse.json(
      { error: "That doesn't look like a valid reference." },
      { status: 400 },
    );
  }

  const lead = await dbGetLeadByReference(reference);
  if (!lead) {
    return NextResponse.json(
      { error: "We couldn't find that reference. Check it, or register as new." },
      { status: 404 },
    );
  }

  if (carId) await dbRecordEnquiry(lead.id, carId);

  return NextResponse.json({
    reference: lead.reference,
    firstName: lead.fullName.split(" ")[0],
  });
}
