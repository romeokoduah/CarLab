import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "@/lib/session";
import { dbGetAdminByEmail } from "@/lib/db/admins";

/** The signed-in admin from the session cookie (cheap; trusts the JWT). */
export async function currentAdmin(): Promise<SessionUser | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * For privileged actions: re-reads the role from the database so a demoted or
 * deactivated admin can't keep acting on an old token.
 */
export async function requireSuperAdmin(): Promise<
  { ok: true; email: string } | { ok: false; status: number }
> {
  const session = await currentAdmin();
  if (!session) return { ok: false, status: 401 };
  const admin = await dbGetAdminByEmail(session.email);
  if (!admin || !admin.active) return { ok: false, status: 401 };
  if (admin.role !== "super_admin") return { ok: false, status: 403 };
  return { ok: true, email: admin.email };
}
