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
}

/** Build a wa.me deep link with a pre-filled, human-sounding message. */
export function buildWhatsAppLink({
  number,
  car,
  listingUrl,
  priceLabel,
  discountCode,
  dealerName = "Eclipse Motors",
}: WhatsAppOpts): string {
  const title = `${car.year} ${car.make} ${car.model}`;
  const lines = [
    `Hi ${dealerName}, I'm interested in the ${title}.`,
    `Price: ${priceLabel}`,
    discountCode ? `I have a discount code: ${discountCode}` : null,
    `Listing: ${listingUrl}`,
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
