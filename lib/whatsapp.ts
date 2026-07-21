import type { Car } from "@/lib/types";

interface WhatsAppOpts {
  number: string;
  car: Car;
  /** absolute or relative listing URL */
  listingUrl: string;
  /** discounted price line, already formatted, optional */
  priceLabel: string;
  discountCode?: string;
  dealerName?: string;
  /** Customer tracking reference, so it lives in their chat history. */
  reference?: string;
}

/** Build a wa.me deep link with a pre-filled, human-sounding message. */
export function buildWhatsAppLink({
  number,
  car,
  listingUrl,
  priceLabel,
  discountCode,
  dealerName = "Eclipse Motors",
  reference,
}: WhatsAppOpts): string {
  const title = `${car.year} ${car.make} ${car.model}`;
  const lines = [
    `Hi ${dealerName}, I'm interested in the ${title}.`,
    `Price: ${priceLabel}`,
    discountCode ? `I have a discount code: ${discountCode}` : null,
    `Listing: ${listingUrl}`,
    // Carried in the message so the customer always has their reference in
    // chat history, and the dealer knows immediately who is writing.
    reference ? `Ref: ${reference}` : null,
    ``,
    `Is it still available?`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}

/** Simple generic contact link (floating button, footer). */
export function buildGenericWhatsAppLink(number: string, dealerName = "Eclipse Motors"): string {
  const text = encodeURIComponent(
    `Hi ${dealerName}, I'd like to know more about your available cars.`,
  );
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Human-readable form of a stored number, which is digits only.
 *
 * Ghanaian mobiles are +233 followed by a 9-digit national number, grouped
 * 2-3-4 the way people write them locally. Anything else is left as typed
 * (bar a leading +) rather than forced into the wrong shape.
 */
export function formatWhatsAppNumber(number: string): string {
  const digits = number.replace(/[^0-9]/g, "");
  if (!digits) return "";
  const gh = digits.match(/^233(\d{2})(\d{3})(\d{4})$/);
  return gh ? `+233 ${gh[1]} ${gh[2]} ${gh[3]}` : `+${digits}`;
}
