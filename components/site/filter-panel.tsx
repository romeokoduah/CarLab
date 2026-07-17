"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/lib/filters";
import { facetsFrom } from "@/lib/filters";
import type { Car } from "@/lib/types";
import { formatMileage } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Facets = ReturnType<typeof facetsFrom>;
type CountMap = Record<string, Record<string, number>>;

interface Props {
  cars: Car[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  counts: CountMap;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-5 first:pt-0">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  count,
  onToggle,
}: {
  label: string;
  checked: boolean;
  count?: number;
  onToggle: () => void;
}) {
  const disabled = count === 0 && !checked;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="flex items-center gap-2.5">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
        {label}
      </span>
      {typeof count === "number" && (
        <span className="tabular-nums text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </label>
  );
}

export function FilterPanel({ cars, filters, onChange, onReset, counts }: Props) {
  const facets = useMemo(() => facetsFrom(cars), [cars]);

  const toggleIn = (key: keyof Filters, value: string) => {
    const list = (filters[key] as string[]) ?? [];
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    // clear dependent models when makes change
    if (key === "makes") {
      onChange({ makes: next, models: [] });
    } else {
      onChange({ [key]: next } as Partial<Filters>);
    }
  };

  // models available given selected makes
  const availableModels =
    filters.makes.length > 0
      ? filters.makes.flatMap((m) => facets.makeModels[m] ?? []).sort()
      : [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-4">
        <span className="text-sm font-semibold">Filters</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <Section title="Make">
        <div className="max-h-52 overflow-y-auto pr-1">
          {facets.makes.map((m) => (
            <CheckRow
              key={m}
              label={m}
              checked={filters.makes.includes(m)}
              count={counts.makes?.[m]}
              onToggle={() => toggleIn("makes", m)}
            />
          ))}
        </div>
      </Section>

      {availableModels.length > 0 && (
        <Section title="Model">
          <div className="max-h-52 overflow-y-auto pr-1">
            {availableModels.map((m) => (
              <CheckRow
                key={m}
                label={m}
                checked={filters.models.includes(m)}
                count={counts.models?.[m]}
                onToggle={() => toggleIn("models", m)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Body type">
        {facets.bodyTypes.map((b) => (
          <CheckRow
            key={b}
            label={b}
            checked={filters.bodyTypes.includes(b)}
            count={counts.bodyTypes?.[b]}
            onToggle={() => toggleIn("bodyTypes", b)}
          />
        ))}
      </Section>

      <Section title="Transmission">
        {facets.transmissions.map((t) => (
          <CheckRow
            key={t}
            label={t}
            checked={filters.transmissions.includes(t)}
            count={counts.transmissions?.[t]}
            onToggle={() => toggleIn("transmissions", t)}
          />
        ))}
      </Section>

      <Section title="Fuel">
        {facets.fuels.map((f) => (
          <CheckRow
            key={f}
            label={f}
            checked={filters.fuels.includes(f)}
            count={counts.fuels?.[f]}
            onToggle={() => toggleIn("fuels", f)}
          />
        ))}
      </Section>

      <Section title="Condition">
        {facets.conditions.map((c) => (
          <CheckRow
            key={c}
            label={c}
            checked={filters.conditions.includes(c)}
            count={counts.conditions?.[c]}
            onToggle={() => toggleIn("conditions", c)}
          />
        ))}
      </Section>

      <Section title="Colour">
        <div className="max-h-40 overflow-y-auto pr-1">
          {facets.colours.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={filters.colours.includes(c)}
              count={counts.colours?.[c]}
              onToggle={() => toggleIn("colours", c)}
            />
          ))}
        </div>
      </Section>

      <Section title="Price (GHS)">
        <RangeControl
          min={facets.priceMin}
          max={facets.priceMax}
          step={5000}
          valueMin={filters.priceMin ?? facets.priceMin}
          valueMax={filters.priceMax ?? facets.priceMax}
          format={(v) => `GHS ${Math.round(v / 1000)}K`}
          onChange={(lo, hi) =>
            onChange({
              priceMin: lo <= facets.priceMin ? undefined : lo,
              priceMax: hi >= facets.priceMax ? undefined : hi,
            })
          }
        />
      </Section>

      <Section title="Year">
        <RangeControl
          min={facets.yearMin}
          max={facets.yearMax}
          step={1}
          valueMin={filters.yearMin ?? facets.yearMin}
          valueMax={filters.yearMax ?? facets.yearMax}
          format={(v) => String(v)}
          onChange={(lo, hi) =>
            onChange({
              yearMin: lo <= facets.yearMin ? undefined : lo,
              yearMax: hi >= facets.yearMax ? undefined : hi,
            })
          }
        />
      </Section>

      <Section title="Max mileage">
        <div className="pt-1">
          <Slider
            min={0}
            max={facets.mileageMax}
            step={2500}
            value={[filters.mileageMax ?? facets.mileageMax]}
            onValueChange={([v]) =>
              onChange({
                mileageMax: v >= facets.mileageMax ? undefined : v,
              })
            }
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Up to {formatMileage(filters.mileageMax ?? facets.mileageMax)}
          </div>
        </div>
      </Section>
    </div>
  );
}

function RangeControl({
  min,
  max,
  step,
  valueMin,
  valueMax,
  format,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  format: (v: number) => string;
  onChange: (lo: number, hi: number) => void;
}) {
  return (
    <div className="pt-1">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[valueMin, valueMax]}
        minStepsBetweenThumbs={1}
        onValueChange={([lo, hi]) => onChange(lo, hi)}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(valueMin)}</span>
        <span>{format(valueMax)}</span>
      </div>
    </div>
  );
}
