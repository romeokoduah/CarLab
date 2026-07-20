import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db/pool";

export type AdminRole = "super_admin" | "admin";

export interface AdminRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  name: string | null;
  active: boolean;
}

/** Safe shape for listing in the UI — never includes the password hash. */
export interface AdminSummary {
  id: string;
  email: string;
  role: AdminRole;
  name: string | null;
  active: boolean;
  createdAt: string;
}

interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  name: string | null;
  active: boolean;
  created_at: Date;
}

export async function dbGetAdminByEmail(
  email: string,
): Promise<AdminRecord | undefined> {
  const { rows } = await getPool().query<AdminRow>(
    `SELECT * FROM admin_users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  if (rows.length === 0) return undefined;
  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role,
    name: r.name,
    active: r.active,
  };
}

export async function dbListAdmins(): Promise<AdminSummary[]> {
  const { rows } = await getPool().query<AdminRow>(
    `SELECT * FROM admin_users ORDER BY created_at ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    name: r.name,
    active: r.active,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function dbCreateAdmin(input: {
  email: string;
  password: string;
  name?: string | null;
  role: AdminRole;
}): Promise<AdminSummary> {
  const { rows } = await getPool().query<AdminRow>(
    `INSERT INTO admin_users (id, email, password_hash, name, role)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      `admin-${randomUUID()}`,
      input.email.trim().toLowerCase(),
      bcrypt.hashSync(input.password, 10),
      input.name?.trim() || null,
      input.role,
    ],
  );
  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    name: r.name,
    active: r.active,
    createdAt: r.created_at.toISOString(),
  };
}

export async function dbUpdateAdmin(
  id: string,
  patch: { role?: AdminRole; active?: boolean; name?: string | null; password?: string },
): Promise<void> {
  const pool = getPool();
  if (patch.role !== undefined) {
    await pool.query(`UPDATE admin_users SET role = $2 WHERE id = $1`, [id, patch.role]);
  }
  if (patch.active !== undefined) {
    await pool.query(`UPDATE admin_users SET active = $2 WHERE id = $1`, [id, patch.active]);
  }
  if (patch.name !== undefined) {
    await pool.query(`UPDATE admin_users SET name = $2 WHERE id = $1`, [id, patch.name]);
  }
  if (patch.password) {
    await pool.query(`UPDATE admin_users SET password_hash = $2 WHERE id = $1`, [
      id,
      bcrypt.hashSync(patch.password, 10),
    ]);
  }
}

export async function dbSetPasswordByEmail(
  email: string,
  password: string,
): Promise<void> {
  await getPool().query(
    `UPDATE admin_users SET password_hash = $2 WHERE email = $1`,
    [email.trim().toLowerCase(), bcrypt.hashSync(password, 10)],
  );
}

export async function dbCountSuperAdmins(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super_admin' AND active`,
  );
  return Number(rows[0].n);
}
