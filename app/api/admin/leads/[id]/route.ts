import { NextResponse } from "next/server";
import { dbDeleteLead } from "@/lib/db/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Right to erasure — enquiries and reservations cascade with the lead. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await dbDeleteLead(params.id);
  return NextResponse.json({ ok: true });
}
