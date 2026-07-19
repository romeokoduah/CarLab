import { NextResponse } from "next/server";
import { dbUpdateCar, dbDeleteCar } from "@/lib/db/cars";
import type { Car } from "@/lib/types";

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
  const car = await dbUpdateCar(params.id, body as Partial<Car>);
  if (!car) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ car });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await dbDeleteCar(params.id);
  return NextResponse.json({ ok: true });
}
