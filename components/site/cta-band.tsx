"use client";

import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { buildGenericWhatsAppLink } from "@/lib/whatsapp";
import { PulsatingButton } from "@/components/magicui/pulsating-button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

export function CtaBand() {
  const mounted = useMounted();
  const settings = useStore((s) => s.settings);
  const href = mounted
    ? buildGenericWhatsAppLink(settings.whatsappNumber, settings.dealerName)
    : "#";

  return (
    <section className="container pb-24">
      <div className="showroom-vignette relative overflow-hidden rounded-3xl border border-border bg-secondary/30 px-8 py-16 text-center">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Looking for something specific? We&apos;ll source it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Tell us the make, model and budget on WhatsApp and our team will find
          the right car — inspected and delivered to Accra.
        </p>
        <div className="mt-8 flex justify-center">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <PulsatingButton>
              <WhatsAppIcon className="h-5 w-5" />
              Message us on WhatsApp
            </PulsatingButton>
          </a>
        </div>
      </div>
    </section>
  );
}
