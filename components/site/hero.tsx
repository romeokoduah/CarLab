import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config";

const TRUST = [
  "Fully inspected",
  "Transparent pricing",
  "Registration handled",
];

/**
 * Static by design. Everything here paints once — no looping gradients, grids
 * or shimmer — so scrolling stays smooth on mobile and nothing flickers in.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Static wash: painted once, never animated. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/[0.07] via-transparent to-transparent" />
      <div className="showroom-vignette pointer-events-none absolute inset-0" />

      <div className="container relative py-20 md:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {SITE_CONFIG.location} · Premium showroom
          </p>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            The car you want,{" "}
            <span className="text-gold">without the guesswork</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Hand-picked, fully inspected vehicles with transparent pricing.
            Browse the showroom and reach us on WhatsApp for a same-day viewing.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/inventory"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gold px-7 text-[15px] font-semibold text-black transition-colors hover:bg-gold/90"
            >
              Explore inventory
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/duty-calculator"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-7 text-[15px] font-medium transition-colors hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4 text-gold" />
              Estimate import duty
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
