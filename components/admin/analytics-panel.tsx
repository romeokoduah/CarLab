"use client";

import { useEffect, useState } from "react";
import { Eye, MessageCircle, Users, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/**
 * Server-backed statistics. The previous version counted events held in the
 * admin's own browser, so it only ever showed that one device's activity.
 */
interface CarStat {
  carId: string;
  label: string;
  views: number;
  enquiries: number;
  people: number;
}
interface Stats {
  days: number;
  totalViews: number;
  totalEnquiries: number;
  totalPeople: number;
  newLeads: number;
  cars: CarStat[];
}

export function AnalyticsPanel() {
  const [days, setDays] = useState("30");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(null);
    fetch(`/api/admin/stats?days=${days}`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => toast.error("Could not load statistics."));
  }, [days]);

  const tiles = [
    { label: "Listing views", value: stats?.totalViews, icon: Eye },
    { label: "Enquiries", value: stats?.totalEnquiries, icon: MessageCircle },
    { label: "People enquiring", value: stats?.totalPeople, icon: Users },
    { label: "New customers", value: stats?.newLeads, icon: UserPlus },
  ];

  const ranked = (stats?.cars ?? []).filter(
    (c) => c.views > 0 || c.enquiries > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Which cars people are looking at and asking about.
        </p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </div>
            {t.value === undefined ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {t.value.toLocaleString("en-GH")}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Most popular listings</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            &ldquo;People&rdquo; counts distinct customers, so one person
            enquiring repeatedly doesn&apos;t look like demand.
          </p>
        </div>

        {!stats ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : ranked.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No activity in this period yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-3 py-3 text-right font-medium">Views</th>
                  <th className="px-3 py-3 text-right font-medium">Enquiries</th>
                  <th className="px-5 py-3 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c) => (
                  <tr key={c.carId} className="border-b border-border/60">
                    <td className="px-5 py-3 font-medium">{c.label}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.views}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.enquiries}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-gold">
                      {c.people}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
