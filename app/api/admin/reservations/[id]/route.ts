import { NextResponse } from "next/server";
import { dbUpdateReservation } from "@/lib/db/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["active", "released", "completed"]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const reservation = await dbUpdateReservation(
    params.id,
    status as "active" | "released" | "completed",
  );
  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ reservation });
}
