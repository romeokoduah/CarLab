import { NextResponse } from "next/server";
import { dbListCarRequests } from "@/lib/db/car-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Behind the /api/admin middleware guard — these rows carry personal data. */
export async function GET() {
  return NextResponse.json({ requests: await dbListCarRequests() });
}
