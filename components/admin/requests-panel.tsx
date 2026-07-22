"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { formatPrice } from "@/lib/currency";
import { toast } from "sonner";

type Status = "new" | "in_progress" | "closed";

interface CarRequest {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  make: string | null;
  model: string | null;
  bodyType: string | null;
  yearFrom: number | null;
  budgetGhs: number | null;
  notes: string | null;
  status: Status;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** wa.me needs digits only; local 0-prefixed numbers get Ghana's country code. */
function waLink(phone: string, name: string, reference: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  const text = encodeURIComponent(
    `Hi ${name.split(" ")[0]}, it's Eclipse Motors about the car you asked us to source (ref ${reference}).`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

function wanted(r: CarRequest): string {
  const parts = [r.make, r.model].filter(Boolean).join(" ");
  return parts || "See notes";
}

export function RequestsPanel() {
  const [list, setList] = useState<CarRequest[] | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/car-requests");
    if (!res.ok) {
      toast.error("Could not load requests.");
      return;
    }
    setList((await res.json()).requests);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/car-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Could not update the request.");
      return;
    }
    await load();
  };

  if (!list) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const shown =
    filter === "open" ? list.filter((r) => r.status !== "closed") : list;
  const newCount = list.filter((r) => r.status === "new").length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Car requests</h2>
          <p className="text-sm text-muted-foreground">
            Buyers asking us to source a car.{" "}
            {newCount > 0
              ? `${newCount} awaiting a first reply — we promise 24 hours.`
              : "Nothing new waiting."}
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as "open" | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="all">All requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {filter === "open" ? "No open requests." : "No requests yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{wanted(r)}</h3>
                    <Badge variant={r.status === "new" ? "gold" : "muted"}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {when(r.createdAt)} · ref{" "}
                    <span className="font-mono">{r.reference}</span>
                  </p>
                </div>
                <Select
                  value={r.status}
                  onValueChange={(v) => patch(r.id, { status: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Budget">
                  {r.budgetGhs ? formatPrice(r.budgetGhs, "GHS", 1) : "—"}
                </Detail>
                <Detail label="Body type">{r.bodyType || "—"}</Detail>
                <Detail label="Customer">{r.customerName}</Detail>
                <Detail label="Contact">
                  {r.customerPhone}
                  {r.customerEmail && (
                    <span className="block truncate text-muted-foreground">
                      {r.customerEmail}
                    </span>
                  )}
                </Detail>
              </dl>

              {r.notes && (
                <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm">
                  {r.notes}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="whatsapp">
                  <a
                    href={waLink(r.customerPhone, r.customerName, r.reference)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Reply on WhatsApp
                  </a>
                </Button>
                {r.customerEmail && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${r.customerEmail}?subject=Your car request (${r.reference})`}>
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  </Button>
                )}
                <Input
                  defaultValue={r.adminNote ?? ""}
                  placeholder="Private note…"
                  className="h-9 max-w-xs flex-1"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== (r.adminNote ?? "")) {
                      void patch(r.id, { adminNote: next });
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{children}</dd>
    </div>
  );
}
