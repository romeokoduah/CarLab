import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import type { DiscountCode } from "@/lib/types";

interface DiscountRow {
  id: string;
  code: string;
  type: DiscountCode["type"];
  value: string; // numeric -> string
  min_price: string | null;
  expires_at: Date | null;
  usage_limit: number | null;
  used_count: number;
  make_restriction: string | null;
  active: boolean;
}

function mapDiscount(r: DiscountRow): DiscountCode {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    value: Number(r.value),
    minPrice: r.min_price != null ? Number(r.min_price) : undefined,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : undefined,
    usageLimit: r.usage_limit ?? undefined,
    usedCount: r.used_count,
    makeRestriction: r.make_restriction ?? undefined,
    active: r.active,
  };
}

const DISCOUNT_COLUMNS = `code=$2, type=$3, value=$4, min_price=$5,
  expires_at=$6, usage_limit=$7, used_count=$8, make_restriction=$9, active=$10`;

function discountValues(id: string, d: Omit<DiscountCode, "id">) {
  return [
    id, d.code, d.type, d.value, d.minPrice ?? null, d.expiresAt ?? null,
    d.usageLimit ?? null, d.usedCount, d.makeRestriction ?? null, d.active,
  ];
}

export async function dbGetDiscounts(): Promise<DiscountCode[]> {
  const { rows } = await getPool().query<DiscountRow>(
    `SELECT * FROM discounts ORDER BY active DESC, code ASC`,
  );
  return rows.map(mapDiscount);
}

export async function dbCreateDiscount(
  input: Omit<DiscountCode, "id" | "usedCount">,
): Promise<DiscountCode> {
  const id = `disc-${randomUUID()}`;
  const full: Omit<DiscountCode, "id"> = { ...input, usedCount: 0 };
  await getPool().query(
    `INSERT INTO discounts (id, code, type, value, min_price, expires_at,
       usage_limit, used_count, make_restriction, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    discountValues(id, full),
  );
  return { ...full, id };
}

export async function dbUpdateDiscount(
  id: string,
  patch: Partial<DiscountCode>,
): Promise<DiscountCode | undefined> {
  const { rows } = await getPool().query<DiscountRow>(
    `SELECT * FROM discounts WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return undefined;
  const merged = { ...mapDiscount(rows[0]), ...patch };
  await getPool().query(
    `UPDATE discounts SET ${DISCOUNT_COLUMNS} WHERE id = $1`,
    discountValues(id, merged),
  );
  return merged;
}

export async function dbDeleteDiscount(id: string): Promise<void> {
  await getPool().query(`DELETE FROM discounts WHERE id = $1`, [id]);
}
