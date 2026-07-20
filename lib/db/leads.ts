import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { generateReference } from "@/lib/reference";

export interface Lead {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  email: string | null;
  consent: boolean;
  createdAt: string;
  lastSeenAt: string;
}

export interface LeadWithActivity extends Lead {
  enquiryCount: number;
  cars: { id: string | null; label: string; createdAt: string }[];
}

interface LeadRow {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  email: string | null;
  consent: boolean;
  created_at: Date;
  last_seen_at: Date;
}

function mapLead(r: LeadRow): Lead {
  return {
    id: r.id,
    reference: r.reference,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    consent: r.consent,
    createdAt: r.created_at.toISOString(),
    lastSeenAt: r.last_seen_at.toISOString(),
  };
}

/** Create a lead with a unique reference (retries on the rare collision). */
export async function dbCreateLead(input: {
  fullName: string;
  phone: string;
  email?: string | null;
  consent: boolean;
}): Promise<Lead> {
  const pool = getPool();
  for (let attempt = 0; attempt < 6; attempt++) {
    const reference = generateReference();
    const { rows } = await pool.query<LeadRow>(
      `INSERT INTO leads (id, reference, full_name, phone, email, consent, consent_at)
       VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $6 THEN now() ELSE NULL END)
       ON CONFLICT (reference) DO NOTHING
       RETURNING *`,
      [
        `lead-${randomUUID()}`,
        reference,
        input.fullName.trim(),
        input.phone.trim(),
        input.email?.trim() || null,
        input.consent,
      ],
    );
    if (rows.length) return mapLead(rows[0]);
  }
  throw new Error("Could not allocate a unique reference");
}

export async function dbGetLeadByReference(
  reference: string,
): Promise<Lead | undefined> {
  const { rows } = await getPool().query<LeadRow>(
    `SELECT * FROM leads WHERE reference = $1`,
    [reference],
  );
  return rows.length ? mapLead(rows[0]) : undefined;
}

export async function dbTouchLead(id: string): Promise<void> {
  await getPool().query(`UPDATE leads SET last_seen_at = now() WHERE id = $1`, [
    id,
  ]);
}

export async function dbRecordEnquiry(
  leadId: string,
  carId: string | null,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO enquiries (id, lead_id, car_id) VALUES ($1,$2,$3)`,
    [`enq-${randomUUID()}`, leadId, carId],
  );
  await pool.query(
    `INSERT INTO events (id, car_id, type) VALUES ($1,$2,'enquiry')`,
    [`evt-${randomUUID()}`, carId],
  );
  await dbTouchLead(leadId);
}

/** Admin listing: leads plus the cars each has asked about. */
export async function dbListLeads(search?: string): Promise<LeadWithActivity[]> {
  const pool = getPool();
  const term = search?.trim();
  const { rows } = await pool.query<LeadRow>(
    term
      ? `SELECT * FROM leads
         WHERE reference ILIKE $1 OR full_name ILIKE $1 OR phone ILIKE $1
            OR COALESCE(email,'') ILIKE $1
         ORDER BY last_seen_at DESC LIMIT 500`
      : `SELECT * FROM leads ORDER BY last_seen_at DESC LIMIT 500`,
    term ? [`%${term}%`] : [],
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const activity = await pool.query<{
    lead_id: string;
    car_id: string | null;
    label: string | null;
    created_at: Date;
  }>(
    `SELECT e.lead_id, e.car_id, e.created_at,
            CASE WHEN c.id IS NULL THEN NULL
                 ELSE c.year || ' ' || c.make || ' ' || c.model END AS label
       FROM enquiries e LEFT JOIN cars c ON c.id = e.car_id
      WHERE e.lead_id = ANY($1) ORDER BY e.created_at DESC`,
    [ids],
  );

  const byLead = new Map<string, LeadWithActivity["cars"]>();
  for (const a of activity.rows) {
    const list = byLead.get(a.lead_id) ?? [];
    list.push({
      id: a.car_id,
      label: a.label ?? "Removed listing",
      createdAt: a.created_at.toISOString(),
    });
    byLead.set(a.lead_id, list);
  }

  return rows.map((r) => {
    const cars = byLead.get(r.id) ?? [];
    return { ...mapLead(r), enquiryCount: cars.length, cars };
  });
}

/** Right to erasure — enquiries and reservations cascade. */
export async function dbDeleteLead(id: string): Promise<void> {
  await getPool().query(`DELETE FROM leads WHERE id = $1`, [id]);
}
