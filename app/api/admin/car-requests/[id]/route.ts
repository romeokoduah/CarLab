import { NextResponse } from "next/server";
import {
  dbUpdateCarRequest,
  type CarRequestStatus,
} from "@/lib/db/car-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: CarRequestStatus[] = ["new", "in_progress", "closed"];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);

  const status =
    typeof body?.status === "string" &&
    STATUSES.includes(body.status as CarRequestStatus)
      ? (body.status as CarRequestStatus)
      : undefined;
  const adminNote =
    typeof body?.adminNote === "string"
      ? body.adminNote.trim() || null
      : undefined;

  if (status === undefined && adminNote === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const request = await dbUpdateCarRequest(params.id, { status, adminNote });
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ request });
}
