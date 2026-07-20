"use client";

import { NumberTicker } from "@/components/magicui/number-ticker";
import { useStore } from "@/lib/store";
import type { Car } from "@/lib/types";

export function StatsBand({ initialCars = [] }: { initialCars?: Car[] }) {
  const storeCars = useStore((s) => s.cars);
  const hydrated = useStore((s) => s.hydrated);

  // Server-provided cars render immediately (and match the first client
  // render), so the counters never flash a placeholder value.
  const cars = hydrated ? storeCars : initialCars;

  const available = cars.filter((c) => c.status !== "Sold").length;
  const sold = cars.filter((c) => c.status === "Sold").length;

  const stats = [
    { label: "Cars available", value: available, suffix: "" },
    { label: "Cars delivered", value: 240 + sold, suffix: "+" },
    { label: "Happy owners", value: 210, suffix: "+" },
    { label: "Avg. days to sell", value: 12, suffix: "" },
  ];

  return (
    <section className="border-y border-border bg-secondary/30">
      <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <NumberTicker value={s.value} className="text-foreground" />
              {s.suffix}
            </div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
