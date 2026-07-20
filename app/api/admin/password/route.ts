import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbGetAdminByEmail, dbSetPasswordByEmail } from "@/lib/db/admins";
import { currentAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Change your own password (any signed-in admin). */
export async function POST(req: Request) {
  const session = await currentAdmin();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (newPassword.length < 10) {
    return NextResponse.json(
      { error: "New password must be at least 10 characters." },
      { status: 400 },
    );
  }

  const admin = await dbGetAdminByEmail(session.email);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
    return NextResponse.json(
      { error: "Your current password is incorrect." },
      { status: 401 },
    );
  }

  await dbSetPasswordByEmail(session.email, newPassword);
  return NextResponse.json({ ok: true });
}
