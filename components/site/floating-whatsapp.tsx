"use client";

import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { buildGenericWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

export function FloatingWhatsApp() {
  const pathname = usePathname();
  const mounted = useMounted();
  const settings = useStore((s) => s.settings);

  if (pathname?.startsWith("/admin")) return null;
  // Car pages carry their own car-specific enquiry buttons — a sticky bar on
  // phones, a sticky panel on desktop — so a second floating button would only
  // overlap them and send a message with no car attached.
  if (pathname?.startsWith("/car/")) return null;

  const number = mounted ? settings.whatsappNumber : undefined;
  const href = number
    ? buildGenericWhatsAppLink(number, settings.dealerName)
    : "#";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-black shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-105 active:scale-95"
    >
      <span className="absolute inset-0 animate-pulse-soft rounded-full" />
      <WhatsAppIcon className="h-7 w-7" />
      <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-lg group-hover:block">
        Chat with us
      </span>
    </a>
  );
}
