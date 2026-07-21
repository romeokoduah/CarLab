import { NextResponse } from "next/server";
import { dbCreateCar, dbGetCars } from "@/lib/db/cars";
import type { Car } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Full car records, cost breakdown included — the admin needs them to edit a
 * listing's pricing. Behind the /api/admin middleware guard; the public
 * /api/cars serves the same cars with the cost fields stripped.
 */
export async function GET() {
  return NextResponse.json({ cars: await dbGetCars() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const car = await dbCreateCar(body as Omit<Car, "id" | "createdAt">);
  return NextResponse.json({ car }, { status: 201 });
}
