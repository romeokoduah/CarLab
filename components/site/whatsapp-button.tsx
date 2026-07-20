"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/currency";
import { Button, type ButtonProps } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { EnquiryGate } from "@/components/site/enquiry-gate";
import { getStoredReference, sendBeacon } from "@/lib/customer";
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
  const [reference, setReference] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    setReference(getStoredReference());
  }, []);

  const priceGhs = finalPriceGhs ?? car.priceGhs;
  const priceLabel = formatPrice(
    priceGhs,
    mounted ? currency : "GHS",
    settings.ghsPerUsd,
  );

  const buildHref = (ref: string) => {
    const listingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/car/${car.id}`
        : `/car/${car.id}`;
    return buildWhatsAppLink({
      number: settings.whatsappNumber,
      car,
      listingUrl,
      priceLabel,
      discountCode,
      dealerName: settings.dealerName,
      reference: ref,
    });
  };

  // Known customer: render a real link so the browser opens WhatsApp as a
  // direct user action, and log the enquiry with a non-blocking beacon.
  if (mounted && reference) {
    return (
      <Button
        asChild
        variant="whatsapp"
        className={cn(fullWidth && "w-full", className)}
        {...rest}
      >
        <a
          href={buildHref(reference)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            sendBeacon("/api/leads/lookup", { reference, carId: car.id })
          }
        >
          <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
          {label}
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="whatsapp"
        className={cn(fullWidth && "w-full", className)}
        onClick={() => setGateOpen(true)}
        {...rest}
      >
        <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
        {label}
      </Button>
      <EnquiryGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        carId={car.id}
        buildHref={buildHref}
      />
    </>
  );
}
