import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { dbGetAdminByEmail } from "@/lib/db/admins";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = await dbGetAdminByEmail(email);
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(admin.email);
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions);
  return NextResponse.json({ ok: true, email: admin.email });
}
