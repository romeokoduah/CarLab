import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/config";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${SITE_CONFIG.dealerName} home`}
    >
      <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-gold/40 bg-gradient-to-br from-gold/25 to-transparent">
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px] text-gold"
          aria-hidden="true"
        >
          <defs>
            <mask id="em-eclipse">
              <circle cx="12" cy="12" r="8" fill="white" />
              <circle cx="15.5" cy="10.5" r="7" fill="black" />
            </mask>
          </defs>
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="currentColor"
            mask="url(#em-eclipse)"
          />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">
        {SITE_CONFIG.dealerName}
      </span>
    </Link>
  );
}
