"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { SITE_CONFIG } from "@/lib/config";
import { useStore } from "@/lib/store";
import { buildGenericWhatsAppLink, formatWhatsAppNumber } from "@/lib/whatsapp";

export function SiteFooter() {
  const pathname = usePathname();
  // The dealer's numbers live in the database, not the build-time env — the
  // footer used to read SITE_CONFIG and so advertised the placeholder number.
  const settings = useStore((s) => s.settings);
  const lines = [settings.whatsappNumber, settings.whatsappNumberAlt].filter(
    (n): n is string => !!n,
  );
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-border">
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {SITE_CONFIG.tagline}. Every vehicle inspected, documented and ready
            to drive. Reach us on WhatsApp for a same-day viewing.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold" /> {SITE_CONFIG.location}
            </span>
            {lines.map((number, i) => (
              <a
                key={number}
                href={buildGenericWhatsAppLink(number, settings.dealerName)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                {/* One icon for the group; the second line indents under it. */}
                {i === 0 ? (
                  <Phone className="h-4 w-4 text-gold" />
                ) : (
                  <span className="h-4 w-4" aria-hidden />
                )}
                {formatWhatsAppNumber(number)}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Browse</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link href="/inventory" className="hover:text-foreground">
                All inventory
              </Link>
            </li>
            <li>
              <Link
                href="/inventory?body=SUV"
                className="hover:text-foreground"
              >
                SUVs
              </Link>
            </li>
            <li>
              <Link
                href="/inventory?cond=New"
                className="hover:text-foreground"
              >
                New arrivals
              </Link>
            </li>
            <li>
              <Link href="/favourites" className="hover:text-foreground">
                Saved cars
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Dealer</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link href="/admin" className="hover:text-foreground">
                Admin dashboard
              </Link>
            </li>
            <li>
              <a
                href={buildGenericWhatsAppLink(
                  settings.whatsappNumber,
                  settings.dealerName,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {SITE_CONFIG.dealerName}. All rights
            reserved.
          </span>
          <span>Prices in GHS. USD shown at a configurable rate.</span>
        </div>
      </div>
    </footer>
  );
}
