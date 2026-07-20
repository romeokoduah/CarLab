import type { Metadata } from "next";
import { DutyCalculator } from "@/components/site/duty-calculator";
import { dbGetDutyConfig } from "@/lib/db/duty";
import { dbGetSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import Duty Calculator",
  description:
    "Estimate the import duty, levies and landed cost of bringing a used car into Ghana — duty bands, overage penalty, NHIL, GETFund and VAT, itemised.",
};

export default async function DutyCalculatorPage() {
  const [config, settings] = await Promise.all([
    dbGetDutyConfig(),
    dbGetSettings(),
  ]);

  return (
    <div className="container py-14 sm:py-20">
      <header className="mb-10 max-w-2xl">
        <p className="text-sm font-medium text-gold">Tools</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Import duty calculator
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Estimate what Ghana Customs will charge to clear a used vehicle, broken
          down line by line — import duty, overage penalty, statutory levies and
          VAT — so there are no surprises at the port.
        </p>
      </header>

      <DutyCalculator config={config} defaultRate={settings.ghsPerUsd} />
    </div>
  );
}
