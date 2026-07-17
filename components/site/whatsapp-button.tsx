"use client";

import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/currency";
import { Button, type ButtonProps } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import type { Car } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props extends Omit<ButtonProps, "children"> {
  car: Car;
  /** discounted final price in GHS, if a code was applied */
  finalPriceGhs?: number;
  discountCode?: string;
  label?: string;
  fullWidth?: boolean;
}

export function WhatsAppButton({
  car,
  finalPriceGhs,
  discountCode,
  label = "Enquire on WhatsApp",
  fullWidth,
  className,
  ...rest
}: Props) {
  const mounted = useMounted();
  const settings = useStore((s) => s.settings);
  const currency = useStore((s) => s.currency);
  const recordEvent = useStore((s) => s.recordEvent);

  const priceGhs = finalPriceGhs ?? car.priceGhs;
  const priceLabel = formatPrice(
    priceGhs,
    mounted ? currency : "GHS",
    settings.ghsPerUsd,
  );

  const listingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/car/${car.id}`
      : `/car/${car.id}`;

  const href = mounted
    ? buildWhatsAppLink({
        number: settings.whatsappNumber,
        car,
        listingUrl,
        priceLabel,
        discountCode,
        dealerName: settings.dealerName,
      })
    : "#";

  return (
    <Button
      asChild
      variant="whatsapp"
      className={cn(fullWidth && "w-full", className)}
      {...rest}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => recordEvent(car.id, "whatsapp_click")}
      >
        <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
        {label}
      </a>
    </Button>
  );
}
