import { NextResponse } from "next/server";
import { dbCreateLead, dbRecordEnquiry } from "@/lib/db/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a lead (first-time enquirer) and optionally log the first enquiry. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const consent = body?.consent === true;
  const carId = typeof body?.carId === "string" ? body.carId : null;

  if (fullName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  // Consent is the lawful basis for storing these details — no consent, no record.
  if (!consent) {
    return NextResponse.json(
      { error: "Please agree to be contacted so we can respond to your enquiry." },
      { status: 400 },
    );
  }

  const lead = await dbCreateLead({ fullName, phone, email, consent });
  if (carId) await dbRecordEnquiry(lead.id, carId);

  return NextResponse.json({
    reference: lead.reference,
    firstName: lead.fullName.split(" ")[0],
  });
}
