import { NextResponse } from "next/server";
import { dbListLeads } from "@/lib/db/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.get("q") ?? undefined;
  const leads = await dbListLeads(search);
  return NextResponse.json({ leads });
}
