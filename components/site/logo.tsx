import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/config";

/** Aspect of the traced lockup. The artwork itself is in logo-artwork.tsx. */
export const LOGO_VIEW_BOX = "0 0 1000 217";

/**
 * The bare artwork, for places that are already inside a link or a heading.
 * Size it with a height class; the width follows from the aspect ratio.
 *
 * Colour comes from `text-logo-ink` (brand blue on light, gold on dark) via
 * the `currentColor` fill on the sprite.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      role="img"
      aria-label={SITE_CONFIG.dealerName}
      // shrink-0: the width comes from the aspect ratio, so as a flex child it
      // would otherwise be squeezed toward zero by the nav beside it.
      className={cn("w-auto shrink-0 text-logo-ink", className)}
    >
      <use href="#em-logo" />
    </svg>
  );
}

/**
 * The logo as a link home. `className` sizes the artwork and *replaces* the
 * default rather than merging with it — merging would leave the default's
 * `sm:h-10` in place, and that beats a caller's plain `h-12` on every screen
 * from 640px up.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE_CONFIG.dealerName} home`}
      className="inline-flex items-center transition-opacity hover:opacity-80"
    >
      <LogoMark className={className ?? "h-9 sm:h-10"} />
    </Link>
  );
}
