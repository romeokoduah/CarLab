"use client";

import { useMemo, useState } from "react";
import { Calculator, Info, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlurFade } from "@/components/magicui/blur-fade";
import { calculateDuty, type DutyConfig, type DutyFuel } from "@/lib/duty";

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

export function DutyCalculator({ config, defaultRate }: Props) {
  const [valueInput, setValueInput] = useState("15000");
  const [valueCurrency, setValueCurrency] = useState<"USD" | "GHS">("USD");
  const [rate, setRate] = useState(String(defaultRate));
  const [fuel, setFuel] = useState<DutyFuel>("Petrol");
  const [engineCc, setEngineCc] = useState("2000");
  const [year, setYear] = useState("2019");

  const ghsPerUsd = Number(rate) > 0 ? Number(rate) : defaultRate;

  const cifGhs = useMemo(() => {
    const v = Number(valueInput);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return valueCurrency === "USD" ? v * ghsPerUsd : v;
  }, [valueInput, valueCurrency, ghsPerUsd]);

  const result = useMemo(
    () =>
      calculateDuty(
        {
          cif: cifGhs,
          fuel,
          engineCc: Number(engineCc) || 0,
          yearOfManufacture: Number(year) || CURRENT_YEAR,
          currentYear: CURRENT_YEAR,
        },
        config,
      ),
    [cifGhs, fuel, engineCc, year, config],
  );

  const landed = cifGhs + result.total;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* ── Inputs ── */}
      <BlurFade className="lg:col-span-2">
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
                  onChange={(e) => setValueInput(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={valueCurrency}
                  onValueChange={(v) => setValueCurrency(v as "USD" | "GHS")}
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
                <Select value={fuel} onValueChange={(v) => setFuel(v as DutyFuel)}>
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
                  onChange={(e) => setEngineCc(e.target.value)}
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
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate">GHS per USD</Label>
                <Input
                  id="rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Vehicle age</span>
                <span className="font-medium text-foreground">
                  {result.age} {result.age === 1 ? "year" : "years"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span>Duty band</span>
                <span className="font-medium text-foreground">
                  {result.dutyRate}%
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span>Overage penalty</span>
                <span className="font-medium text-foreground">
                  {result.overageRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── Breakdown ── */}
      <BlurFade delay={0.08} className="lg:col-span-3">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated duties &amp; levies
            </h2>
            <Calculator className="h-4 w-4 text-gold" />
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

        {/* ── Disclaimer ── */}
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
                published schedule, so treat the penalty line as indicative.
                Always confirm with a licensed clearing agent before committing.
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
              {config.note && (
                <p className="pt-1 text-[11px] opacity-70">{config.note}</p>
              )}
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
