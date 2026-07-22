"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Printer, Ban, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ReceiptDocument } from "@/components/admin/receipt-document";
import { useStore } from "@/lib/store";
import { receiptTotals, validateAmounts } from "@/lib/receipt";
import { toast } from "sonner";

interface Receipt {
  id: string;
  receiptNo: string;
  carId: string | null;
  leadId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicleLabel: string;
  vehicleDetails: string | null;
  vin: string | null;
  priceGhs: number;
  amountPaidGhs: number;
  balanceGhs: number;
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
  status: "issued" | "void";
  issuedBy: string | null;
  issuedAt: string;
}

const PAYMENT_METHODS = [
  "Bank transfer",
  "Mobile money",
  "Cash",
  "Cheque",
  "Card",
];

const cedis = (n: number) => `GHS ${n.toLocaleString("en-GH")}`;

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const NO_CAR = "__none__";

export function ReceiptsPanel() {
  const cars = useStore((s) => s.cars);
  const settings = useStore((s) => s.settings);
  const [list, setList] = useState<Receipt[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The receipt currently staged for printing. */
  const [printing, setPrinting] = useState<Receipt | null>(null);

  const [carId, setCarId] = useState(NO_CAR);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [vin, setVin] = useState("");
  const [priceGhs, setPriceGhs] = useState("");
  const [amountPaidGhs, setAmountPaidGhs] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/receipts");
    if (!res.ok) {
      toast.error("Could not load receipts.");
      return;
    }
    setList((await res.json()).receipts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setCarId(NO_CAR);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setVehicleLabel("");
    setVehicleDetails("");
    setVin("");
    setPriceGhs("");
    setAmountPaidGhs("");
    setPaymentMethod(PAYMENT_METHODS[0]);
    setPaymentRef("");
    setNotes("");
    setError(null);
  };

  /** Picking a listing fills in the vehicle and its price, all still editable. */
  const pickCar = (id: string) => {
    setCarId(id);
    if (id === NO_CAR) return;
    const car = cars.find((c) => c.id === id);
    if (!car) return;
    setVehicleLabel(`${car.year} ${car.make} ${car.model}`);
    setVehicleDetails(
      [
        car.colour,
        `${car.mileageKm.toLocaleString("en-GH")} km`,
        car.transmission,
        car.fuel,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    setPriceGhs(String(car.priceGhs));
  };

  const preview = useMemo(
    () =>
      receiptTotals({
        priceGhs: Number(priceGhs) || 0,
        amountPaidGhs: Number(amountPaidGhs) || 0,
      }),
    [priceGhs, amountPaidGhs],
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateAmounts({
      priceGhs: Number(priceGhs),
      amountPaidGhs: Number(amountPaidGhs),
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carId === NO_CAR ? null : carId,
          customerName,
          customerPhone,
          customerEmail,
          vehicleLabel,
          vehicleDetails,
          vin,
          priceGhs: Number(priceGhs),
          amountPaidGhs: Number(amountPaidGhs),
          paymentMethod,
          paymentRef,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not issue the receipt.");
      toast.success(`Receipt ${data.receipt.receiptNo} issued`);
      setOpen(false);
      reset();
      await load();
      // Straight to print — issuing one is almost always followed by handing
      // it over.
      print(data.receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  /** Mount the document, let React paint it, then hand off to the browser. */
  const print = (receipt: Receipt) => {
    setPrinting(receipt);
    setTimeout(() => window.print(), 80);
  };

  const voidReceipt = async (r: Receipt) => {
    const reason = window.prompt(
      `Void receipt ${r.receiptNo}? It stays on file, marked void.\n\nReason (optional):`,
    );
    if (reason === null) return;
    const res = await fetch(`/api/admin/receipts/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "void", reason }),
    });
    if (!res.ok) {
      toast.error("Could not void the receipt.");
      return;
    }
    toast.success(`${r.receiptNo} voided`);
    await load();
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Receipts</h2>
          <p className="text-sm text-muted-foreground">
            Issue a receipt when a customer pays. Numbered EM-{new Date().getFullYear()}-0001
            onwards and printable for handover.
          </p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Issue receipt
        </Button>
      </div>

      {!list ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No receipts issued yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {r.receiptNo}
                  </span>
                  {r.status === "void" ? (
                    <Badge variant="destructive">Void</Badge>
                  ) : r.balanceGhs > 0 ? (
                    <Badge variant="warning">
                      Balance {cedis(r.balanceGhs)}
                    </Badge>
                  ) : (
                    <Badge variant="success">Paid in full</Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm">
                  {r.customerName} · {r.vehicleLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {when(r.issuedAt)} · {cedis(r.amountPaidGhs)} received
                  {r.paymentMethod ? ` · ${r.paymentMethod}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => print(r)}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
                {r.status !== "void" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => voidReceipt(r)}
                  >
                    <Ban className="h-4 w-4" /> Void
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue a receipt</DialogTitle>
            <DialogDescription>
              Details are copied onto the receipt as they are now, so it stays
              accurate even if the listing changes later.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vehicle from inventory</Label>
              <Select value={carId} onValueChange={pickCar}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a listing…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CAR}>
                    Not from inventory — type it below
                  </SelectItem>
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.year} {c.make} {c.model} — {cedis(c.priceGhs)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle">
                <Input
                  value={vehicleLabel}
                  onChange={(e) => setVehicleLabel(e.target.value)}
                  placeholder="2021 Changan UNI-K"
                  required
                />
              </Field>
              <Field label="Vehicle details" optional>
                <Input
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  placeholder="White · 39,000 km · Automatic"
                />
              </Field>
              <Field label="VIN / chassis number" optional>
                <Input value={vin} onChange={(e) => setVin(e.target.value)} />
              </Field>
              <Field label="Customer name">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Customer phone" optional>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  inputMode="tel"
                />
              </Field>
              <Field label="Customer email" optional>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <Field label="Agreed price (GHS)">
                <Input
                  type="number"
                  value={priceGhs}
                  onChange={(e) => setPriceGhs(e.target.value)}
                  required
                />
              </Field>
              <Field label="Amount received (GHS)">
                <Input
                  type="number"
                  value={amountPaidGhs}
                  onChange={(e) => setAmountPaidGhs(e.target.value)}
                  required
                />
              </Field>
              <div className="sm:col-span-2 text-sm">
                <span className="text-muted-foreground">Balance: </span>
                <span className="font-semibold text-gold">
                  {cedis(preview.balanceGhs)}
                </span>
                {preview.fullySettled && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    paid in full
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payment method">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Payment reference" optional>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Transfer / MoMo reference"
                />
              </Field>
            </div>

            <Field label="Notes" optional>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything that should appear on the receipt."
              />
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Issuing…" : "Issue & print"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden on screen; the only thing @media print reveals. */}
      {printing && (
        <ReceiptDocument
          receipt={printing}
          dealerName={settings.dealerName}
          dealerPhone={settings.whatsappNumber}
          dealerPhoneAlt={settings.whatsappNumberAlt}
        />
      )}
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            optional
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}
