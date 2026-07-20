import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";

export interface Reservation {
  id: string;
  carId: string;
  carLabel: string;
  leadId: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  adminEmail: string | null;
  note: string | null;
  status: "active" | "released" | "completed";
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
}

interface Row {
  id: string;
  car_id: string;
  car_label: string | null;
  lead_id: string;
  reference: string;
  full_name: string;
  phone: string;
  admin_email: string | null;
  note: string | null;
  status: Reservation["status"];
  created_at: Date;
  expires_at: Date | null;
}

const SELECT = `
  SELECT r.*, l.reference, l.full_name, l.phone,
         c.year || ' ' || c.make || ' ' || c.model AS car_label
    FROM reservations r
    JOIN leads l ON l.id = r.lead_id
    LEFT JOIN cars c ON c.id = r.car_id`;

function map(r: Row): Reservation {
  const expiresAt = r.expires_at ? r.expires_at.toISOString() : null;
  return {
    id: r.id,
    carId: r.car_id,
    carLabel: r.car_label ?? "Removed listing",
    leadId: r.lead_id,
    reference: r.reference,
    customerName: r.full_name,
    customerPhone: r.phone,
    adminEmail: r.admin_email,
    note: r.note,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    expiresAt,
    // Flagged, never silently released — an admin decides what happens next.
    expired:
      r.status === "active" && !!r.expires_at && r.expires_at.getTime() < Date.now(),
  };
}

export async function dbListReservations(): Promise<Reservation[]> {
  const { rows } = await getPool().query<Row>(
    `${SELECT} ORDER BY r.created_at DESC LIMIT 500`,
  );
  return rows.map(map);
}

export async function dbCreateReservation(input: {
  carId: string;
  leadId: string;
  adminEmail: string | null;
  note?: string | null;
  holdDays: number;
}): Promise<Reservation> {
  const pool = getPool();
  const id = `res-${randomUUID()}`;
  await pool.query(
    `INSERT INTO reservations (id, car_id, lead_id, admin_email, note, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + ($6 || ' days')::interval)`,
    [
      id,
      input.carId,
      input.leadId,
      input.adminEmail,
      input.note?.trim() || null,
      String(input.holdDays),
    ],
  );
  // Reflect the hold on the storefront immediately.
  await pool.query(`UPDATE cars SET status = 'Reserved' WHERE id = $1`, [
    input.carId,
  ]);
  const { rows } = await pool.query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  return map(rows[0]);
}

export async function dbUpdateReservation(
  id: string,
  status: Reservation["status"],
): Promise<Reservation | undefined> {
  const pool = getPool();
  const { rows } = await pool.query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  if (rows.length === 0) return undefined;

  await pool.query(`UPDATE reservations SET status = $2 WHERE id = $1`, [
    id,
    status,
  ]);
  // Releasing frees the car; completing means it sold.
  if (status === "released") {
    await pool.query(
      `UPDATE cars SET status = 'Available' WHERE id = $1`,
      [rows[0].car_id],
    );
  } else if (status === "completed") {
    await pool.query(`UPDATE cars SET status = 'Sold' WHERE id = $1`, [
      rows[0].car_id,
    ]);
  }
  const updated = await pool.query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  return map(updated.rows[0]);
}
