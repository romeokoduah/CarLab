import { NextResponse } from "next/server";
import { dbCreateCar } from "@/lib/db/cars";
import type { Car } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const car = await dbCreateCar(body as Omit<Car, "id" | "createdAt">);
  return NextResponse.json({ car }, { status: 201 });
}
