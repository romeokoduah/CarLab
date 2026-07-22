import { NextResponse } from "next/server";
import { dbCreateLead, dbGetLeadByReference } from "@/lib/db/leads";
import { dbCreateCarRequest } from "@/lib/db/car-requests";
import { normalizeReference } from "@/lib/reference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public "source me this car" request from the landing page.
 *
 * Contact details go on `leads` exactly like a WhatsApp enquiry, so a
 * returning customer keeps one reference rather than collecting a new one per
 * request. Consent is required — it is the lawful basis for holding the
 * details at all (Ghana Data Protection Act, 2012).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const consent = body?.consent === true;

  if (fullName.length < 2) {
    return NextResponse.json(
      { error: "Please enter your full name." },
      { status: 400 },
    );
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json(
      { error: "Please enter a valid WhatsApp number." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!consent) {
    return NextResponse.json(
      { error: "Please agree to be contacted so we can reply to your request." },
      { status: 400 },
    );
  }

  const make = String(body?.make ?? "").trim();
  const model = String(body?.model ?? "").trim();
  const notes = String(body?.notes ?? "").trim();
  if (!make && !model && !notes) {
    return NextResponse.json(
      { error: "Tell us which car you're looking for." },
      { status: 400 },
    );
  }

  const budgetRaw = Number(body?.budgetGhs);
  const budgetGhs =
    Number.isFinite(budgetRaw) && budgetRaw > 0 ? Math.round(budgetRaw) : null;
  const yearRaw = Number(body?.yearFrom);
  const yearFrom =
    Number.isInteger(yearRaw) && yearRaw >= 1980 && yearRaw <= 2100
      ? yearRaw
      : null;

  // Returning customers send their reference so everything stays on one record.
  const reference = normalizeReference(String(body?.reference ?? ""));
  const existing = reference ? await dbGetLeadByReference(reference) : undefined;
  const lead =
    existing ?? (await dbCreateLead({ fullName, phone, email, consent }));

  await dbCreateCarRequest({
    leadId: lead.id,
    make,
    model,
    bodyType: String(body?.bodyType ?? "").trim(),
    yearFrom,
    budgetGhs,
    notes,
  });

  return NextResponse.json({
    reference: lead.reference,
    firstName: lead.fullName.split(" ")[0],
  });
}
