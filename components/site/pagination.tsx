"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Numbered pagination with Prev/Next. Collapses long runs to
 * `1 … 4 5 6 … 12` so the control stays a single tidy row on a phone.
 */
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const nums = pageWindow(page, totalPages);

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1.5"
      aria-label="Pagination"
    >
      <PagerButton
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </PagerButton>

      {nums.map((n, i) =>
        n === "…" ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition-colors",
              n === page
                ? "bg-gold text-black"
                : "border border-border text-foreground hover:bg-accent",
            )}
          >
            {n}
          </button>
        ),
      )}

      <PagerButton
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </PagerButton>
    </nav>
  );
}

function PagerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Page numbers to show, with "…" gaps, keeping the current page in the middle. */
function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return range(1, total);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
