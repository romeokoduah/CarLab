"use client";

import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DEFAULT_DUTY_CONFIG,
  type DutyConfig,
  type DutyBand,
  type OverageBracket,
} from "@/lib/duty";

const LEVY_LABELS: Record<keyof DutyConfig["levies"], string> = {
  ecowas: "ECOWAS Levy",
  au: "AU Levy",
  specialImport: "Special Import Levy",
  processingFee: "Processing Fee",
  examFee: "Examination Fee",
  nhil: "NHIL",
  getfund: "GETFund Levy",
  vat: "VAT",
};

function bandLabel(band: DutyBand, prev: DutyBand | undefined): string {
  const from = prev?.maxCc ? prev.maxCc + 1 : 0;
  return band.maxCc === null ? `Above ${from - 1}cc` : `${from}–${band.maxCc}cc`;
}

function bracketLabel(b: OverageBracket): string {
  return b.maxYears === null
    ? `Over ${b.minYears} years`
    : `${b.minYears}–${b.maxYears} years`;
}

export function DutyRatesForm() {
  const [config, setConfig] = useState<DutyConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/duty-config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .catch(() => toast.error("Could not load duty rates."));
  }, []);

  if (!config) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const setBand = (
    key: "petrolBands" | "dieselBands",
    i: number,
    rate: number,
  ) =>
    setConfig({
      ...config,
      [key]: config[key].map((b, idx) => (idx === i ? { ...b, rate } : b)),
    });

  const setBracket = (i: number, rate: number) =>
    setConfig({
      ...config,
      overage: config.overage.map((b, idx) => (idx === i ? { ...b, rate } : b)),
    });

  const setLevy = (key: keyof DutyConfig["levies"], value: number) =>
    setConfig({ ...config, levies: { ...config.levies, [key]: value } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/duty-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Duty rates saved");
    } catch {
      toast.error("Could not save duty rates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        These rates power the public{" "}
        <span className="font-medium text-foreground">
          import duty calculator
        </span>
        . Update them whenever the national budget changes rates — no code
        change needed.
      </p>

      {/* Duty bands */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["petrolBands", "dieselBands"] as const).map((key) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">
              {key === "petrolBands" ? "Petrol" : "Diesel"} duty bands
            </h3>
            <div className="space-y-3">
              {config[key].map((band, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-muted-foreground">
                    {bandLabel(band, config[key][i - 1])}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      inputMode="decimal"
                      value={band.rate}
                      onChange={(e) =>
                        setBand(key, i, Number(e.target.value) || 0)
                      }
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Overage penalties */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold">Overage penalty</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Charged on CIF for older vehicles. Applied by customs practice rather
          than a published schedule — review periodically.
        </p>
        <div className="space-y-3">
          {config.overage.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-muted-foreground">
                {bracketLabel(b)}
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  inputMode="decimal"
                  value={b.rate}
                  onChange={(e) => setBracket(i, Number(e.target.value) || 0)}
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Levies */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Levies &amp; fees</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(LEVY_LABELS) as (keyof DutyConfig["levies"])[]).map(
            (key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs">
                  {LEVY_LABELS[key]}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id={key}
                    inputMode="decimal"
                    value={config.levies[key]}
                    onChange={(e) => setLevy(key, Number(e.target.value) || 0)}
                    className="text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Note */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <Label htmlFor="note" className="text-xs">
          Footnote shown on the calculator
        </Label>
        <Input
          id="note"
          value={config.note}
          onChange={(e) => setConfig({ ...config, note: e.target.value })}
          className="mt-1.5"
          placeholder="e.g. Rates reviewed July 2026"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="gold" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save rates"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfig({ ...DEFAULT_DUTY_CONFIG })}
        >
          <RotateCcw className="h-4 w-4" /> Reset to published defaults
        </Button>
      </div>
    </div>
  );
}
