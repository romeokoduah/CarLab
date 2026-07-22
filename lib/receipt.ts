/**
 * Sales receipts.
 *
 * A receipt is a financial document: the numbering has to be predictable and
 * gap-free enough to reconcile, and the arithmetic has to be exact. Amounts
 * are whole cedis (the same unit prices are stored in), so there is no
 * floating-point money anywhere.
 */

/** `EM-2026-0001` — dealer prefix, year issued, then a per-year counter. */
export function formatReceiptNo(year: number, sequence: number): string {
  return `EM-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Pulls the counter back out of a receipt number, or null if it isn't one. */
export function parseReceiptNo(
  receiptNo: string,
): { year: number; sequence: number } | null {
  const m = receiptNo.trim().match(/^EM-(\d{4})-(\d{4,})$/);
  if (!m) return null;
  return { year: Number(m[1]), sequence: Number(m[2]) };
}

/**
 * The next number for a year, given the ones already issued in it. Numbering
 * restarts each year, so only that year's receipts are considered.
 */
export function nextReceiptNo(year: number, existing: string[]): string {
  let highest = 0;
  for (const no of existing) {
    const parsed = parseReceiptNo(no);
    if (parsed?.year === year && parsed.sequence > highest) {
      highest = parsed.sequence;
    }
  }
  return formatReceiptNo(year, highest + 1);
}

export interface ReceiptAmounts {
  /** Agreed price of the vehicle, in whole cedis. */
  priceGhs: number;
  /** Paid on this receipt, in whole cedis. */
  amountPaidGhs: number;
}

export interface ReceiptTotals {
  priceGhs: number;
  amountPaidGhs: number;
  balanceGhs: number;
  fullySettled: boolean;
}

/**
 * Balance outstanding after this payment. A payment larger than the price is
 * allowed to settle the balance but never reported as a negative balance —
 * an overpayment is a conversation, not a debt owed to the customer.
 */
export function receiptTotals(a: ReceiptAmounts): ReceiptTotals {
  const priceGhs = Math.max(0, Math.round(a.priceGhs));
  const amountPaidGhs = Math.max(0, Math.round(a.amountPaidGhs));
  const balanceGhs = Math.max(0, priceGhs - amountPaidGhs);
  return {
    priceGhs,
    amountPaidGhs,
    balanceGhs,
    fullySettled: amountPaidGhs >= priceGhs && priceGhs > 0,
  };
}

/** Whether a set of amounts is safe to write to a receipt. */
export function validateAmounts(a: ReceiptAmounts): string | null {
  if (!Number.isFinite(a.priceGhs) || a.priceGhs <= 0) {
    return "Enter the agreed vehicle price.";
  }
  if (!Number.isFinite(a.amountPaidGhs) || a.amountPaidGhs <= 0) {
    return "Enter the amount received.";
  }
  return null;
}

/** Whole cedis in words, for the amount line every receipt is expected to carry. */
export function amountInWords(amount: number): string {
  const n = Math.max(0, Math.round(amount));
  if (n === 0) return "Zero cedis only";
  return `${numberToWords(n)} cedis only`.replace(/^./, (c) => c.toUpperCase());
}

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

function under1000(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const rest = n % 10;
    return TENS[Math.floor(n / 10)] + (rest ? `-${ONES[rest]}` : "");
  }
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${under1000(rest)}` : ""}`;
}

function numberToWords(n: number): string {
  if (n === 0) return "zero";
  const scales: [number, string][] = [
    [1_000_000_000, "billion"],
    [1_000_000, "million"],
    [1_000, "thousand"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [value, name] of scales) {
    if (rest >= value) {
      parts.push(`${under1000(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(under1000(rest));
  return parts.join(" ");
}
