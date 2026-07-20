"use client";

import { useState } from "react";
import { Calculator, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateDuty,
  type DutyConfig,
  type DutyFuel,
  type DutyResult,
} from "@/lib/duty";

const ICUMS_URL =
  "https://external.unipassghana.com/cl/tm/tax/selectUsedVehicleTaxCalculate.do?decorator=popup&MENU_ID=IIM01S03V02";

function ghs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(n);
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const CURRENT_YEAR = 2026;

interface Props {
  config: DutyConfig;
  defaultRate: number;
}

interface Calculated {
  result: DutyResult;
  cifGhs: number;
  ghsPerUsd: number;
}

export function DutyCalculator({ config, defaultRate }: Props) {
  const [valueInput, setValueInput] = useState("15000");
  const [valueCurrency, setValueCurrency] = useState<"USD" | "GHS">("USD");
  const [rate, setRate] = useState(String(defaultRate));
  const [fuel, setFuel] = useState<DutyFuel>("Petrol");
  const [engineCc, setEngineCc] = useState("2000");
  const [year, setYear] = useState("2019");

  // Result only exists after the user taps Calculate; any input change clears
  // it, so a number on screen is never stale relative to the inputs.
  const [calc, setCalc] = useState<Calculated | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wrap a setter so editing any field clears the last result.
  function bind<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setCalc(null);
      setError(null);
    };
  }

  const onCalculate = () => {
    const value = Number(valueInput);
    const ghsPerUsd = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter the vehicle value.");
      return;
    }
    if (!Number.isFinite(ghsPerUsd) || ghsPerUsd <= 0) {
      setError("Enter a valid GHS/USD rate.");
      return;
    }
    const cifGhs = valueCurrency === "USD" ? value * ghsPerUsd : value;
    const result = calculateDuty(
      {
        cif: cifGhs,
        fuel,
        engineCc: Number(engineCc) || 0,
        yearOfManufacture: Number(year) || CURRENT_YEAR,
        currentYear: CURRENT_YEAR,
      },
      config,
    );
    setError(null);
    setCalc({ result, cifGhs, ghsPerUsd });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* ── Inputs ── */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vehicle details
          </h2>

          <div className="mt-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="value">Customs value (CIF)</Label>
              <div className="flex gap-2">
                <Input
                  id="value"
                  inputMode="numeric"
                  value={valueInput}
                  onChange={(e) => bind(setValueInput)(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={valueCurrency}
                  onValueChange={(v) =>
                    bind(setValueCurrency)(v as "USD" | "GHS")
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GHS">GHS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Cost + Insurance + Freight. Customs will use its own ICUMS value
                (from the VIN), which is often higher than what you paid.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fuel">Fuel</Label>
                <Select
                  value={fuel}
                  onValueChange={(v) => bind(setFuel)(v as DutyFuel)}
                >
                  <SelectTrigger id="fuel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc">Engine (cc)</Label>
                <Input
                  id="cc"
                  inputMode="numeric"
                  value={engineCc}
                  onChange={(e) => bind(setEngineCc)(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="year">Year of manufacture</Label>
                <Input
                  id="year"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => bind(setYear)(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate">GHS per USD</Label>
                <Input
                  id="rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => bind(setRate)(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              variant="gold"
              className="h-11 w-full"
              onClick={onCalculate}
            >
              <Calculator className="h-4 w-4" /> Calculate duty
            </Button>
          </div>
        </div>
      </div>

      {/* ── Breakdown ── */}
      <div className="lg:col-span-3">
        {!calc ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
              <Calculator className="h-5 w-5" />
            </span>
            <p className="mt-4 font-medium">Your estimate appears here</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Enter the vehicle details and tap{" "}
              <span className="font-medium text-foreground">Calculate duty</span>{" "}
              to see the full breakdown.
            </p>
          </div>
        ) : (
          <DutyBreakdown calc={calc} />
        )}
      </div>
    </div>
  );
}

function DutyBreakdown({ calc }: { calc: Calculated }) {
  const { result, cifGhs, ghsPerUsd } = calc;
  const landed = cifGhs + result.total;

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Estimated duties &amp; levies
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Age: {result.age}y</span>
            <span>Duty: {result.dutyRate}%</span>
            <span>Overage: {result.overageRate}%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Charge</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">
                  Charged on
                </th>
                <th className="px-3 py-3 text-right font-medium">Rate</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 text-muted-foreground">
                <td className="px-6 py-3">Customs value (CIF)</td>
                <td className="hidden px-3 py-3 sm:table-cell">—</td>
                <td className="px-3 py-3 text-right">—</td>
                <td className="px-6 py-3 text-right tabular-nums">
                  {ghs(cifGhs)}
                </td>
              </tr>
              {result.lines.map((line) => (
                <tr key={line.label} className="border-b border-border/60">
                  <td className="px-6 py-3 font-medium">{line.label}</td>
                  <td className="hidden px-3 py-3 text-xs text-muted-foreground sm:table-cell">
                    {line.basis}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {line.rate}%
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {ghs(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b border-border bg-gold/5">
                <td className="px-6 py-4 font-semibold" colSpan={3}>
                  Total duties &amp; levies
                </td>
                <td className="px-6 py-4 text-right text-base font-semibold tabular-nums text-gold">
                  {ghs(result.total)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold" colSpan={3}>
                  Estimated landed cost
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    CIF + duties
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums">
                  <div>{ghs(landed)}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    ≈ {usd(ghsPerUsd > 0 ? landed / ghsPerUsd : 0)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                This is an estimate, not a customs assessment.
              </span>{" "}
              Ghana Customs values used vehicles through ICUMS, which derives a
              Home Delivery Value from the VIN, country of origin and age —
              typically higher than the price paid. Rates also change with each
              national budget.
            </p>
            <p>
              Overage penalties are applied by customs practice rather than a
              published schedule, so treat that line as indicative. Always
              confirm with a licensed clearing agent before committing.
            </p>
            <a
              href={ICUMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-gold hover:underline"
            >
              Check the official ICUMS calculator
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
