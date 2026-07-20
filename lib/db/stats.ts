import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";

export interface CarStat {
  carId: string;
  label: string;
  views: number;
  enquiries: number;
  people: number;
}

export interface StatsSummary {
  days: number;
  totalViews: number;
  totalEnquiries: number;
  totalPeople: number;
  newLeads: number;
  cars: CarStat[];
}

/**
 * Record an anonymous interest event. `sessionKey` is a random browser token
 * used only to de-duplicate — never an IP address.
 */
export async function dbRecordEvent(
  carId: string,
  type: "view" | "favourite",
  sessionKey: string | null,
): Promise<void> {
  const pool = getPool();
  if (type === "view" && sessionKey) {
    // One view per session per car per day keeps refreshes from inflating counts.
    const { rows } = await pool.query(
      `SELECT 1 FROM events
        WHERE car_id = $1 AND type = 'view' AND session_key = $2
          AND created_at > now() - interval '1 day' LIMIT 1`,
      [carId, sessionKey],
    );
    if (rows.length) return;
  }
  await pool.query(
    `INSERT INTO events (id, car_id, type, session_key) VALUES ($1,$2,$3,$4)`,
    [`evt-${randomUUID()}`, carId, type, sessionKey],
  );
}

export async function dbGetStats(days = 30): Promise<StatsSummary> {
  const pool = getPool();
  const since = `${days} days`;

  const perCar = await pool.query<{
    car_id: string;
    label: string | null;
    views: string;
    enquiries: string;
    people: string;
  }>(
    `SELECT c.id AS car_id,
            c.year || ' ' || c.make || ' ' || c.model AS label,
            COUNT(*) FILTER (WHERE e.type = 'view')     AS views,
            COUNT(*) FILTER (WHERE e.type = 'enquiry')  AS enquiries,
            COUNT(DISTINCT q.lead_id)                    AS people
       FROM cars c
       LEFT JOIN events e
         ON e.car_id = c.id AND e.created_at > now() - $1::interval
       LEFT JOIN enquiries q
         ON q.car_id = c.id AND q.created_at > now() - $1::interval
      GROUP BY c.id, label
      ORDER BY views DESC, enquiries DESC`,
    [since],
  );

  const totals = await pool.query<{ views: string; enquiries: string }>(
    `SELECT COUNT(*) FILTER (WHERE type = 'view')    AS views,
            COUNT(*) FILTER (WHERE type = 'enquiry') AS enquiries
       FROM events WHERE created_at > now() - $1::interval`,
    [since],
  );

  const people = await pool.query<{ n: string }>(
    `SELECT COUNT(DISTINCT lead_id) AS n FROM enquiries
      WHERE created_at > now() - $1::interval`,
    [since],
  );

  const newLeads = await pool.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM leads WHERE created_at > now() - $1::interval`,
    [since],
  );

  return {
    days,
    totalViews: Number(totals.rows[0]?.views ?? 0),
    totalEnquiries: Number(totals.rows[0]?.enquiries ?? 0),
    totalPeople: Number(people.rows[0]?.n ?? 0),
    newLeads: Number(newLeads.rows[0]?.n ?? 0),
    cars: perCar.rows.map((r) => ({
      carId: r.car_id,
      label: r.label ?? "Unknown",
      views: Number(r.views),
      enquiries: Number(r.enquiries),
      people: Number(r.people),
    })),
  };
}
