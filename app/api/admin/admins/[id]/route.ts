import { NextResponse } from "next/server";
import {
  dbCountSuperAdmins,
  dbListAdmins,
  dbUpdateAdmin,
} from "@/lib/db/admins";
import { requireSuperAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const admins = await dbListAdmins();
  const target = admins.find((a) => a.id === params.id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextRole =
    body?.role === "super_admin" || body?.role === "admin" ? body.role : undefined;
  const nextActive = typeof body?.active === "boolean" ? body.active : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;

  if (password !== undefined && password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters." },
      { status: 400 },
    );
  }

  // Never allow the last active super admin to be demoted or switched off —
  // that would lock everyone out of user management permanently.
  const losingSuper =
    target.role === "super_admin" &&
    ((nextRole && nextRole !== "super_admin") || nextActive === false);
  if (losingSuper && (await dbCountSuperAdmins()) <= 1) {
    return NextResponse.json(
      { error: "This is the only super admin — promote someone else first." },
      { status: 409 },
    );
  }

  await dbUpdateAdmin(params.id, {
    role: nextRole,
    active: nextActive,
    password,
  });
  return NextResponse.json({ ok: true });
}
