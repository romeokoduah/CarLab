"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { buildWhatsAppLink, formatWhatsAppNumber } from "@/lib/whatsapp";
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
  /**
   * Offer the dealer's second line under the button. Only worth it where
   * there is room to explain it — not in the compact sticky phone bar.
   */
  showAltLine?: boolean;
}

export function WhatsAppButton({
  car,
  finalPriceGhs,
  discountCode,
  label = "Enquire on WhatsApp",
  fullWidth,
  showAltLine,
  className,
  ...rest
}: Props) {
  const mounted = useMounted();
  const settings = useStore((s) => s.settings);
  const currency = useStore((s) => s.currency);
  const [reference, setReference] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  /** Which line the customer picked, so the gate finishes on that number. */
  const [target, setTarget] = useState(settings.whatsappNumber);

  useEffect(() => {
    setReference(getStoredReference());
  }, []);

  const priceGhs = finalPriceGhs ?? car.priceGhs;
  const priceLabel = formatPrice(
    priceGhs,
    mounted ? currency : "GHS",
    settings.ghsPerUsd,
  );

  const buildHrefFor = (ref: string, number: string) => {
    const listingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/car/${car.id}`
        : `/car/${car.id}`;
    return buildWhatsAppLink({
      number,
      car,
      listingUrl,
      priceLabel,
      discountCode,
      dealerName: settings.dealerName,
      reference: ref,
    });
  };

  const alt = mounted ? settings.whatsappNumberAlt : undefined;
  const openGateFor = (number: string) => {
    setTarget(number);
    setGateOpen(true);
  };

  /** "Or try our other line — +233 …", under the main button. */
  const altLine = showAltLine && alt && (
    <p className="text-center text-xs text-muted-foreground">
      Or reach our other line{" "}
      {reference ? (
        <a
          href={buildHrefFor(reference, alt)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sendBeacon("/api/leads/lookup", { reference, carId: car.id })}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {formatWhatsAppNumber(alt)}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => openGateFor(alt)}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {formatWhatsAppNumber(alt)}
        </button>
      )}
    </p>
  );

  // Known customer: render a real link so the browser opens WhatsApp as a
  // direct user action, and log the enquiry with a non-blocking beacon.
  if (mounted && reference) {
    return (
      <>
        <Button
          asChild
          variant="whatsapp"
          className={cn(fullWidth && "w-full", className)}
          {...rest}
        >
          <a
            href={buildHrefFor(reference, settings.whatsappNumber)}
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
        {altLine}
      </>
    );
  }

  return (
    <>
      <Button
        variant="whatsapp"
        className={cn(fullWidth && "w-full", className)}
        onClick={() => openGateFor(settings.whatsappNumber)}
        {...rest}
      >
        <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
        {label}
      </Button>
      {altLine}
      <EnquiryGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        carId={car.id}
        buildHref={(ref) => buildHrefFor(ref, target)}
      />
    </>
  );
}
