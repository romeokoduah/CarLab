"use client";

import { useMemo } from "react";
import { Eye, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import type { AnalyticsEventType } from "@/lib/types";

export function AnalyticsPanel() {
  const mounted = useMounted();
  const cars = useStore((s) => s.cars);
  const analytics = useStore((s) => s.analytics);
  const favourites = useStore((s) => s.favourites);

  const stats = useMemo(() => {
    const per: Record<
      string,
      { view: number; favourite: number; whatsapp_click: number }
    > = {};
    for (const c of cars) per[c.id] = { view: 0, favourite: 0, whatsapp_click: 0 };
    for (const e of analytics) {
      if (per[e.carId]) per[e.carId][e.type] += 1;
    }
    const totals = analytics.reduce(
      (acc, e) => {
        acc[e.type] += 1;
        return acc;
      },
      { view: 0, favourite: 0, whatsapp_click: 0 } as Record<
        AnalyticsEventType,
        number
      >,
    );
    const rank = (key: keyof (typeof per)[string]) =>
      [...cars]
        .map((c) => ({ car: c, n: per[c.id]?.[key] ?? 0 }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 5);

    return {
      totals,
      views: rank("view"),
      whats: rank("whatsapp_click"),
      favs: [...cars]
        .map((c) => ({ car: c, n: favourites.includes(c.id) ? 1 : 0 }))
        .filter((r) => r.n > 0)
        .concat(
          [...cars]
            .map((c) => ({ car: c, n: per[c.id]?.favourite ?? 0 }))
            .filter((r) => r.n > 0),
        )
        .sort((a, b) => b.n - a.n)
        .slice(0, 5),
    };
  }, [cars, analytics, favourites]);

  const cards = [
    { label: "Total views", value: stats.totals.view, icon: Eye },
    {
      label: "WhatsApp clicks",
      value: stats.totals.whatsapp_click,
      icon: MessageCircle,
    },
    { label: "Favourites", value: stats.totals.favourite, icon: Heart },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {mounted ? <NumberTicker value={c.value} /> : 0}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RankList
          title="Most viewed"
          icon={<TrendingUp className="h-4 w-4 text-gold" />}
          rows={stats.views}
          suffix="views"
        />
        <RankList
          title="Most WhatsApp enquiries"
          icon={<MessageCircle className="h-4 w-4 text-gold" />}
          rows={stats.whats}
          suffix="clicks"
        />
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Analytics are collected on this device as you browse the storefront
        (views, favourites and WhatsApp clicks). Wire these events to your
        backend to aggregate across all visitors.
      </p>
    </div>
  );
}

function RankList({
  title,
  icon,
  rows,
  suffix,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { car: { id: string; year: number; make: string; model: string }; n: number }[];
  suffix: string;
}) {
  const has = rows.some((r) => r.n > 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {!has ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No activity yet. Browse the storefront to generate data.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows
            .filter((r) => r.n > 0)
            .map((r, i) => (
              <li key={r.car.id} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {r.car.year} {r.car.make} {r.car.model}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {r.n}{" "}
                  <span className="text-xs text-muted-foreground">{suffix}</span>
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
