import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { nextReceiptNo, receiptTotals } from "@/lib/receipt";

/**
 * Sales receipts.
 *
 * Customer and vehicle details are copied onto the row rather than joined:
 * a receipt has to keep reading exactly as issued even after the listing is
 * edited, re-priced or deleted. The car and lead ids are kept alongside, but
 * only as a soft link (ON DELETE SET NULL) for reporting.
 */

export type ReceiptStatus = "issued" | "void";

export interface Receipt {
  id: string;
  receiptNo: string;
  carId: string | null;
  leadId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicleLabel: string;
  vehicleDetails: string | null;
  vin: string | null;
  priceGhs: number;
  amountPaidGhs: number;
  balanceGhs: number;
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
  status: ReceiptStatus;
  issuedBy: string | null;
  issuedAt: string;
}

interface Row {
  id: string;
  receipt_no: string;
  car_id: string | null;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_label: string;
  vehicle_details: string | null;
  vin: string | null;
  price_ghs: string; // bigint -> string
  amount_paid_ghs: string;
  payment_method: string | null;
  payment_ref: string | null;
  notes: string | null;
  status: ReceiptStatus;
  issued_by: string | null;
  issued_at: Date;
}

function map(r: Row): Receipt {
  const priceGhs = Number(r.price_ghs);
  const amountPaidGhs = Number(r.amount_paid_ghs);
  return {
    id: r.id,
    receiptNo: r.receipt_no,
    carId: r.car_id,
    leadId: r.lead_id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    vehicleLabel: r.vehicle_label,
    vehicleDetails: r.vehicle_details,
    vin: r.vin,
    priceGhs,
    amountPaidGhs,
    // Derived, never stored — one source of truth for the arithmetic.
    balanceGhs: receiptTotals({ priceGhs, amountPaidGhs }).balanceGhs,
    paymentMethod: r.payment_method,
    paymentRef: r.payment_ref,
    notes: r.notes,
    status: r.status,
    issuedBy: r.issued_by,
    issuedAt: r.issued_at.toISOString(),
  };
}

export interface NewReceipt {
  carId?: string | null;
  leadId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vehicleLabel: string;
  vehicleDetails?: string | null;
  vin?: string | null;
  priceGhs: number;
  amountPaidGhs: number;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  notes?: string | null;
  issuedBy?: string | null;
}

/**
 * Issue a receipt.
 *
 * The number is allocated from the ones already issued this year. Two admins
 * saving at the same instant would compute the same next number, so the UNIQUE
 * constraint on receipt_no is the real arbiter and the loser simply retries.
 */
export async function dbCreateReceipt(input: NewReceipt): Promise<Receipt> {
  const pool = getPool();
  const year = new Date().getFullYear();
  const { priceGhs, amountPaidGhs } = receiptTotals({
    priceGhs: input.priceGhs,
    amountPaidGhs: input.amountPaidGhs,
  });

  for (let attempt = 0; attempt < 6; attempt++) {
    const { rows: taken } = await pool.query<{ receipt_no: string }>(
      `SELECT receipt_no FROM receipts WHERE receipt_no LIKE $1`,
      [`EM-${year}-%`],
    );
    const receiptNo = nextReceiptNo(
      year,
      taken.map((t) => t.receipt_no),
    );

    const { rows } = await pool.query<Row>(
      `INSERT INTO receipts
         (id, receipt_no, car_id, lead_id, customer_name, customer_phone,
          customer_email, vehicle_label, vehicle_details, vin, price_ghs,
          amount_paid_ghs, payment_method, payment_ref, notes, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (receipt_no) DO NOTHING
       RETURNING *`,
      [
        `rcpt-${randomUUID()}`,
        receiptNo,
        input.carId ?? null,
        input.leadId ?? null,
        input.customerName.trim(),
        input.customerPhone?.trim() || null,
        input.customerEmail?.trim() || null,
        input.vehicleLabel.trim(),
        input.vehicleDetails?.trim() || null,
        input.vin?.trim() || null,
        priceGhs,
        amountPaidGhs,
        input.paymentMethod?.trim() || null,
        input.paymentRef?.trim() || null,
        input.notes?.trim() || null,
        input.issuedBy ?? null,
      ],
    );
    if (rows.length) return map(rows[0]);
  }
  throw new Error("Could not allocate a receipt number");
}

export async function dbListReceipts(): Promise<Receipt[]> {
  const { rows } = await getPool().query<Row>(
    `SELECT * FROM receipts ORDER BY issued_at DESC`,
  );
  return rows.map(map);
}

export async function dbGetReceipt(id: string): Promise<Receipt | undefined> {
  const { rows } = await getPool().query<Row>(
    `SELECT * FROM receipts WHERE id = $1`,
    [id],
  );
  return rows.length ? map(rows[0]) : undefined;
}

/**
 * Void a receipt. Deliberately not a delete: the number stays used and the
 * record stays auditable, which is the whole point of issuing one.
 */
export async function dbVoidReceipt(
  id: string,
  reason?: string | null,
): Promise<Receipt | undefined> {
  const existing = await dbGetReceipt(id);
  if (!existing) return undefined;
  const note = reason?.trim()
    ? `${existing.notes ? `${existing.notes}\n` : ""}VOIDED: ${reason.trim()}`
    : existing.notes;
  const { rows } = await getPool().query<Row>(
    `UPDATE receipts SET status = 'void', notes = $2 WHERE id = $1 RETURNING *`,
    [id, note],
  );
  return rows.length ? map(rows[0]) : undefined;
}
