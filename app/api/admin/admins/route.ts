import { NextResponse } from "next/server";
import {
  dbCreateAdmin,
  dbGetAdminByEmail,
  dbListAdmins,
} from "@/lib/db/admins";
import { requireSuperAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: guard.status });
  }
  return NextResponse.json({ admins: await dbListAdmins() });
}

export async function POST(req: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = typeof body?.name === "string" ? body.name : null;
  const role = body?.role === "super_admin" ? "super_admin" : "admin";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters." },
      { status: 400 },
    );
  }
  if (await dbGetAdminByEmail(email)) {
    return NextResponse.json(
      { error: "An admin with that email already exists." },
      { status: 409 },
    );
  }

  const admin = await dbCreateAdmin({ email, password, name, role });
  return NextResponse.json({ admin }, { status: 201 });
}
