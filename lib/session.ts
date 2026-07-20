import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session tokens: a signed (HS256) JWT stored in an httpOnly cookie.
 * Edge-safe (jose, no Node-only APIs) so middleware can verify it. Signed with
 * SESSION_SECRET — server env only, never exposed to the client.
 */
export const SESSION_COOKIE = "em_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

/** Kept in sync with lib/db/admins.ts; type-only so no DB code reaches the edge. */
export type SessionRole = "super_admin" | "admin";

export interface SessionUser {
  email: string;
  role: SessionRole;
}

export async function createSessionToken(
  email: string,
  role: SessionRole,
): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.email !== "string") return null;
    const role: SessionRole =
      payload.role === "super_admin" ? "super_admin" : "admin";
    return { email: payload.email, role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
