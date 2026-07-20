"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

interface Reservation {
  id: string;
  carId: string;
  carLabel: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  adminEmail: string | null;
  note: string | null;
  status: "active" | "released" | "completed";
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
}

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReservationsPanel() {
  const cars = useStore((s) => s.cars);
  const hydrate = useStore((s) => s.hydrate);
  const [list, setList] = useState<Reservation[] | null>(null);
  const [open, setOpen] = useState(false);
  const [carId, setCarId] = useState("");
  const [reference, setReference] = useState("");
  const [holdDays, setHoldDays] = useState("3");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reservations");
    if (!res.ok) {
      toast.error("Could not load reservations.");
      return;
    }
    setList((await res.json()).reservations);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          reference,
          holdDays: Number(holdDays),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reserve.");
      toast.success("Car reserved");
      setOpen(false);
      setCarId("");
      setReference("");
      setNote("");
      void load();
      void hydrate(); // car status changed to Reserved
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reserve.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: Reservation["status"]) => {
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(status === "released" ? "Reservation released" : "Marked as sold");
      void load();
      void hydrate();
    } else {
      toast.error("Could not update that reservation.");
    }
  };

  const active = (list ?? []).filter((r) => r.status === "active");
  const past = (list ?? []).filter((r) => r.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Hold a car for a customer using their reference. Expired holds are
          flagged — the car is never released without you.
        </p>
        <Button variant="gold" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Reserve a car
        </Button>
      </div>

      {!list ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="font-medium">No active reservations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reserve a car against a customer&apos;s reference to hold it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border bg-card p-4 ${
                r.expired ? "border-destructive/50" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="rounded-md border border-gold/40 bg-gold/5 px-2.5 py-1 font-mono text-sm font-semibold tracking-[0.1em] text-gold">
                  {r.reference}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.carLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.customerName} · {r.customerPhone}
                  </p>
                </div>
                {r.expired ? (
                  <Badge variant="default" className="bg-destructive/15 text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Hold expired
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CalendarClock className="h-3 w-3" /> until {when(r.expiresAt)}
                  </Badge>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus(r.id, "released")}
                  >
                    Release
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => setStatus(r.id, "completed")}
                  >
                    Mark sold
                  </Button>
                </div>
              </div>
              {r.note && (
                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  {r.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Past reservations
          </h3>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {past.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {r.reference}
                </span>
                <span className="flex-1 truncate">{r.carLabel}</span>
                <Badge variant="default" className="text-[10px] capitalize">
                  {r.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {when(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reserve a car</DialogTitle>
            <DialogDescription>
              The car will show as Reserved on the site straight away.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="res-car">Car</Label>
              <Select value={carId} onValueChange={setCarId}>
                <SelectTrigger id="res-car">
                  <SelectValue placeholder="Choose a listing" />
                </SelectTrigger>
                <SelectContent>
                  {cars
                    .filter((c) => c.status !== "Sold")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.year} {c.make} {c.model}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-ref">Customer reference</Label>
              <Input
                id="res-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="A7K2-9QMX"
                className="font-mono tracking-[0.1em]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-days">Hold for (days)</Label>
              <Input
                id="res-days"
                inputMode="numeric"
                value={holdDays}
                onChange={(e) => setHoldDays(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-note">Note (optional)</Label>
              <Input
                id="res-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Paying deposit Friday"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={busy}>
              {busy ? "Reserving…" : "Reserve car"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
