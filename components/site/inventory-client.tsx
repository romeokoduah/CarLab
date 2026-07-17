"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CarGrid } from "@/components/site/car-grid";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { useStore } from "@/lib/store";
import { useMounted, useDebounced } from "@/lib/hooks";
import {
  EMPTY_FILTERS,
  applyFilters,
  countActiveFilters,
  facetsFrom,
  filtersToQuery,
  parseFilters,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import type { Car } from "@/lib/types";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "mileage-asc", label: "Lowest mileage" },
  { value: "year-desc", label: "Year: newest" },
];

const FACET_FIELD: Record<string, (c: Car) => string> = {
  makes: (c) => c.make,
  models: (c) => c.model,
  bodyTypes: (c) => c.bodyType,
  transmissions: (c) => c.transmission,
  fuels: (c) => c.fuel,
  conditions: (c) => c.condition,
  colours: (c) => c.colour,
};

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

export function InventoryClient() {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();

  const cars = useStore((s) => s.cars);

  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters(new URLSearchParams(urlQuery)),
  );
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const debouncedSearch = useDebounced(searchDraft, 300);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Adopt external URL changes (links, back/forward).
  useEffect(() => {
    const incoming = parseFilters(new URLSearchParams(urlQuery));
    if (filtersToQuery(incoming) !== filtersToQuery(filters)) {
      setFilters(incoming);
      setSearchDraft(incoming.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // Push debounced search into filters.
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      setFilters((f) => ({ ...f, q: debouncedSearch }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local filters -> URL (debounced, shareable & back-button friendly).
  useEffect(() => {
    const q = filtersToQuery(filters);
    const t = setTimeout(() => {
      if (q !== urlQuery) {
        router.replace(q ? `/inventory?${q}` : "/inventory", { scroll: false });
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onChange = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const onReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
  };

  const facets = useMemo(() => facetsFrom(cars), [cars]);
  const counts = useMemo(() => facetCounts(cars, filters), [cars, filters]);
  const results = useMemo(() => applyFilters(cars, filters), [cars, filters]);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="container py-8 md:py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Inventory
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mounted ? (
            <>
              <span className="font-medium text-foreground">
                {results.length}
              </span>{" "}
              {results.length === 1 ? "car" : "cars"} matching your search
            </>
          ) : (
            "Loading the showroom…"
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

          <Select
            value={filters.sort}
            onValueChange={(v) => onChange({ sort: v as SortKey })}
          >
            <SelectTrigger className="h-11 w-[180px]">
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
        <div className="min-w-0 flex-1">
          {!mounted ? (
            <CarGridSkeleton count={6} />
          ) : results.length > 0 ? (
            <CarGrid cars={results} />
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
