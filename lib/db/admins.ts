import { getPool } from "@/lib/db/pool";

export interface AdminRecord {
  id: string;
  email: string;
  passwordHash: string;
}

interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
}

export async function dbGetAdminByEmail(
  email: string,
): Promise<AdminRecord | undefined> {
  const { rows } = await getPool().query<AdminRow>(
    `SELECT id, email, password_hash FROM admin_users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  if (rows.length === 0) return undefined;
  return {
    id: rows[0].id,
    email: rows[0].email,
    passwordHash: rows[0].password_hash,
  };
}
