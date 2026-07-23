"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterPanel } from "@/components/site/filter-panel";
import { FilterChips } from "@/components/site/filter-chips";
import { QuickChips } from "@/components/site/quick-chips";
import { Pagination } from "@/components/site/pagination";
import { CarGrid } from "@/components/site/car-grid";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { Shuffle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDebounced } from "@/lib/hooks";
import {
  EMPTY_FILTERS,
  applyFilters,
  countActiveFilters,
  facetsFrom,
  filtersToQuery,
  parseFilters,
  seededShuffle,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import type { Car } from "@/lib/types";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "mileage-asc", label: "Lowest mileage" },
  { value: "year-desc", label: "Year: newest" },
];

/** Cars per page. A multiple of the 1/2/3-column grid so rows stay full. */
const PAGE_SIZE = 12;
const SEED_KEY = "em_shuffle_seed";

const FACET_FIELD: Record<string, (c: Car) => string> = {
  makes: (c) => c.make,
  models: (c) => c.model,
  bodyTypes: (c) => c.bodyType,
  transmissions: (c) => c.transmission,
  fuels: (c) => c.fuel,
  conditions: (c) => c.condition,
  colours: (c) => c.colour,
};

/**
 * Where the shopper was in the results when they opened a car.
 *
 * The filters themselves survive a back-navigation already — they live in the
 * URL. What was lost was the shopper's place in the list: opening the twelfth
 * result and coming back dropped them at the top of the page to hunt for it
 * again. Saved per-tab and only when a car is actually opened from these
 * results, so arriving at /inventory fresh still starts at the top.
 */
const SCROLL_KEY = "em_inventory_scroll";
/** Long enough to read a listing and come back; short enough to go stale. */
const SCROLL_TTL_MS = 30 * 60 * 1000;

interface SavedScroll {
  query: string;
  y: number;
  at: number;
}

function readSavedScroll(): SavedScroll | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedScroll;
    if (typeof parsed?.y !== "number" || typeof parsed?.query !== "string") {
      return null;
    }
    if (Date.now() - (parsed.at ?? 0) > SCROLL_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function facetCounts(cars: Car[], filters: Filters) {
  const map: Record<string, Record<string, number>> = {};
  for (const key of Object.keys(FACET_FIELD)) {
    const without = { ...filters, [key]: [] } as Filters;
    const base = applyFilters(cars, without);
    const tally: Record<string, number> = {};
    for (const c of base) {
      const v = FACET_FIELD[key](c);
      tally[v] = (tally[v] ?? 0) + 1;
    }
    map[key] = tally;
  }
  return map;
}

export function InventoryClient({
  initialCars = [],
}: {
  initialCars?: Car[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();

  const storeCars = useStore((s) => s.cars);
  const hydrated = useStore((s) => s.hydrated);
  // Render server-provided cars immediately; swap to the store once loaded.
  const cars = hydrated ? storeCars : initialCars;
  const ready = hydrated || initialCars.length > 0;

  const initialParams = new URLSearchParams(urlQuery);
  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters(initialParams),
  );
  const [page, setPage] = useState<number>(() =>
    Math.max(1, Number(initialParams.get("page")) || 1),
  );
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const debouncedSearch = useDebounced(searchDraft, 300);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // A per-session shuffle seed: the browse order is mixed up on a fresh visit
  // but stays put while paginating or returning from a car in the same tab.
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    let s = Number(sessionStorage.getItem(SEED_KEY));
    if (!s) {
      s = (Math.floor(Math.random() * 1e9) + 1) >>> 0;
      try {
        sessionStorage.setItem(SEED_KEY, String(s));
      } catch {
        /* private mode: a fresh seed each render is fine */
      }
    }
    setSeed(s);
  }, []);

  const reshuffle = () => {
    const s = (Math.floor(Math.random() * 1e9) + 1) >>> 0;
    try {
      sessionStorage.setItem(SEED_KEY, String(s));
    } catch {
      /* ignore */
    }
    setSeed(s);
    setPage(1);
  };

  // Build the full query, page included, and reflect state -> URL.
  const buildUrl = (f: Filters, p: number) => {
    const params = new URLSearchParams(filtersToQuery(f));
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `/inventory?${q}` : "/inventory";
  };

  // Adopt external URL changes (shared links, back/forward).
  useEffect(() => {
    const params = new URLSearchParams(urlQuery);
    const incoming = parseFilters(params);
    const incomingPage = Math.max(1, Number(params.get("page")) || 1);
    if (
      filtersToQuery(incoming) !== filtersToQuery(filters) ||
      incomingPage !== page
    ) {
      setFilters(incoming);
      setSearchDraft(incoming.q);
      setPage(incomingPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // Push debounced search into filters; a new search always starts on page 1.
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      setFilters((f) => ({ ...f, q: debouncedSearch }));
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local state -> URL (debounced, shareable & back-button friendly).
  useEffect(() => {
    const href = buildUrl(filters, page);
    const t = setTimeout(() => {
      const current = urlQuery ? `/inventory?${urlQuery}` : "/inventory";
      if (href !== current) router.replace(href, { scroll: false });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  // Remember the position only when a car is opened from these results, so a
  // deliberate visit to /inventory is never hijacked back down the page.
  const rememberScroll = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest?.('a[href^="/car/"]')) return;
    try {
      sessionStorage.setItem(
        SCROLL_KEY,
        JSON.stringify({ query: urlQuery, y: window.scrollY, at: Date.now() }),
      );
    } catch {
      // Private-browsing quota: losing the position is not worth an error.
    }
  };

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !ready) return;
    restoredRef.current = true;

    const saved = readSavedScroll();
    // Only for the same result set — a different search deserves the top.
    if (!saved || saved.query !== urlQuery || saved.y <= 0) return;
    try {
      sessionStorage.removeItem(SCROLL_KEY);
    } catch {
      /* nothing to clean up */
    }

    // Cards carry fixed aspect ratios, but images and fonts can still settle
    // after the first paint — retry briefly until the position sticks.
    let attempts = 0;
    const settle = () => {
      window.scrollTo(0, saved.y);
      if (++attempts < 6 && Math.abs(window.scrollY - saved.y) > 4) {
        setTimeout(settle, 60);
      }
    };
    const raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [ready, urlQuery]);

  // Any filter/sort change puts the shopper back on page 1 — page 3 of the old
  // result set is meaningless against a new one.
  const onChange = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const onReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
    setPage(1);
  };

  // In Featured mode the browse order is a seeded shuffle; every other sort is
  // deterministic, so the shuffle is skipped. Filtering then narrows this.
  //
  // The shuffle runs over a canonically-sorted copy (by id), NOT the array as
  // it happens to arrive: a Fisher–Yates permutes positions, so shuffling the
  // SSR order and the hydrated-store order with the same seed would otherwise
  // give two different results and the list would jump. Sorting first makes
  // the order a pure function of (car set, seed) — stable across hydration,
  // pagination and back-navigation.
  const ordered = useMemo(() => {
    if (filters.sort !== "featured" || !seed) return cars;
    const canonical = [...cars].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return seededShuffle(canonical, seed);
  }, [cars, filters.sort, seed]);

  const facets = useMemo(() => facetsFrom(cars), [cars]);
  const counts = useMemo(() => facetCounts(cars, filters), [cars, filters]);
  const results = useMemo(
    () => applyFilters(ordered, filters),
    [ordered, filters],
  );
  const activeCount = countActiveFilters(filters);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageCars = results.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    // Jump to the top of the results, not the top of the whole page.
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="container py-8 md:py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Inventory
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {!ready ? (
            "Loading available vehicles…"
          ) : results.length === 0 ? (
            "No cars match your search"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {pageStart + 1}–{pageStart + pageCars.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {results.length}
              </span>{" "}
              {results.length === 1 ? "car" : "cars"}
            </>
          )}
        </p>
      </div>

      {/* Search + sort bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Try “automatic SUV under 250k” or “diesel Toyota”"
            className="h-11 pl-10 pr-9"
            aria-label="Search inventory"
          />
          {searchDraft && (
            <button
              onClick={() => setSearchDraft("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile filter trigger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-11 shrink-0 gap-2 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-semibold text-black">
                    {activeCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] overflow-y-auto p-6"
            >
              <SheetHeader className="mb-2">
                <SheetTitle>Filter {results.length} results</SheetTitle>
              </SheetHeader>
              <FilterPanel
                cars={cars}
                filters={filters}
                onChange={onChange}
                onReset={onReset}
                counts={counts}
              />
              <Button
                className="mt-4 w-full"
                variant="gold"
                onClick={() => setSheetOpen(false)}
              >
                Show {results.length} results
              </Button>
            </SheetContent>
          </Sheet>

          {/* Re-mix the featured order on demand. */}
          {filters.sort === "featured" && (
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={reshuffle}
              aria-label="Shuffle the order"
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          )}

          <Select
            value={filters.sort}
            onValueChange={(v) => onChange({ sort: v as SortKey })}
          >
            <SelectTrigger className="h-11 w-[150px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* One-tap quick filters */}
      <QuickChips
        bodyTypes={facets.bodyTypes}
        filters={filters}
        onChange={onChange}
      />

      {/* Chips */}
      {activeCount > 0 && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <FilterChips
            filters={filters}
            onChange={onChange}
            facetPrice={{ min: facets.priceMin, max: facets.priceMax }}
            facetYear={{ min: facets.yearMin, max: facets.yearMax }}
            facetMileage={facets.mileageMax}
          />
          <button
            onClick={onReset}
            className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 no-scrollbar">
            <FilterPanel
              cars={cars}
              filters={filters}
              onChange={onChange}
              onReset={onReset}
              counts={counts}
            />
          </div>
        </aside>

        {/* Results */}
        <div
          ref={resultsRef}
          className="min-w-0 flex-1 scroll-mt-24"
          onClick={rememberScroll}
        >
          {!ready ? (
            <CarGridSkeleton count={6} />
          ) : results.length > 0 ? (
            <>
              <CarGrid cars={pageCars} />
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPage={goToPage}
              />
            </>
          ) : (
            <EmptyState onReset={onReset} />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">No cars match those filters</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Try widening your price or year range, or clearing a filter or two.
      </p>
      <Button onClick={onReset} variant="gold" className="mt-6">
        Reset filters
      </Button>
    </div>
  );
}
