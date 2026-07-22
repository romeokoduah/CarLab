import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";

/**
 * "Find me this car" requests raised from the landing page.
 *
 * The requester's contact details live on `leads`, not here — so they get the
 * same reference as any other customer, show up in the Customers directory,
 * and are erased with them when a privacy deletion is actioned.
 */

export type CarRequestStatus = "new" | "in_progress" | "closed";

export interface CarRequest {
  id: string;
  leadId: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  make: string | null;
  model: string | null;
  bodyType: string | null;
  yearFrom: number | null;
  budgetGhs: number | null;
  notes: string | null;
  status: CarRequestStatus;
  adminNote: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  lead_id: string;
  reference: string;
  full_name: string;
  phone: string;
  email: string | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  year_from: number | null;
  budget_ghs: string | null; // bigint -> string
  notes: string | null;
  status: CarRequestStatus;
  admin_note: string | null;
  created_at: Date;
}

const SELECT = `
  SELECT r.*, l.reference, l.full_name, l.phone, l.email
    FROM car_requests r
    JOIN leads l ON l.id = r.lead_id`;

function map(r: Row): CarRequest {
  return {
    id: r.id,
    leadId: r.lead_id,
    reference: r.reference,
    customerName: r.full_name,
    customerPhone: r.phone,
    customerEmail: r.email,
    make: r.make,
    model: r.model,
    bodyType: r.body_type,
    yearFrom: r.year_from,
    budgetGhs: r.budget_ghs == null ? null : Number(r.budget_ghs),
    notes: r.notes,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at.toISOString(),
  };
}

export async function dbCreateCarRequest(input: {
  leadId: string;
  make?: string | null;
  model?: string | null;
  bodyType?: string | null;
  yearFrom?: number | null;
  budgetGhs?: number | null;
  notes?: string | null;
}): Promise<CarRequest> {
  const id = `req-${randomUUID()}`;
  await getPool().query(
    `INSERT INTO car_requests
       (id, lead_id, make, model, body_type, year_from, budget_ghs, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      input.leadId,
      input.make?.trim() || null,
      input.model?.trim() || null,
      input.bodyType?.trim() || null,
      input.yearFrom ?? null,
      input.budgetGhs ?? null,
      input.notes?.trim() || null,
    ],
  );
  const { rows } = await getPool().query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  return map(rows[0]);
}

/** Newest first, and open requests ahead of closed ones. */
export async function dbListCarRequests(): Promise<CarRequest[]> {
  const { rows } = await getPool().query<Row>(
    `${SELECT}
      ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
               r.created_at DESC`,
  );
  return rows.map(map);
}

export async function dbUpdateCarRequest(
  id: string,
  patch: { status?: CarRequestStatus; adminNote?: string | null },
): Promise<CarRequest | undefined> {
  const { rows: existing } = await getPool().query<Row>(
    `${SELECT} WHERE r.id = $1`,
    [id],
  );
  if (!existing.length) return undefined;
  const current = map(existing[0]);
  await getPool().query(
    `UPDATE car_requests SET status = $2, admin_note = $3 WHERE id = $1`,
    [
      id,
      patch.status ?? current.status,
      patch.adminNote === undefined ? current.adminNote : patch.adminNote,
    ],
  );
  const { rows } = await getPool().query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  return map(rows[0]);
}

/** Badge count for the admin tab. */
export async function dbCountNewCarRequests(): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM car_requests WHERE status = 'new'`,
  );
  return Number(rows[0]?.count ?? 0);
}
