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
        <span className="text-sm font-bold tracking-tighter text-gold">CL</span>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">
        {SITE_CONFIG.dealerName}
      </span>
    </Link>
  );
}
