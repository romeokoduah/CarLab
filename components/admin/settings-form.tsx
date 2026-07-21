"use client";

import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/currency";
import { previewReprice, type RepriceRow } from "@/lib/pricing";
import type { Settings } from "@/lib/types";
import { toast } from "sonner";

export function SettingsForm() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetData = useStore((s) => s.resetData);
  const cars = useStore((s) => s.cars);
  // The re-price preview is computed from the loaded catalogue, so saving waits
  // for it — otherwise a rate change could skip its own confirmation.
  const hydrated = useStore((s) => s.hydrated);

  const [dealerName, setDealerName] = useState(settings.dealerName);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [whatsappNumberAlt, setWhatsappNumberAlt] = useState(
    settings.whatsappNumberAlt ?? "",
  );
  const [rate, setRate] = useState(String(settings.ghsPerUsd));
  const [rmbRate, setRmbRate] = useState(String(settings.ghsPerRmb));
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, setPending] = useState<Settings | null>(null);
  const [preview, setPreview] = useState<RepriceRow[]>([]);
  const [saving, setSaving] = useState(false);

  const commit = async (next: Settings) => {
    setSaving(true);
    try {
      const repriced = await updateSettings(next);
      toast.success(
        repriced > 0
          ? `Settings saved — ${repriced} ${repriced === 1 ? "car" : "cars"} re-priced`
          : "Settings saved",
      );
    } catch {
      toast.error("Could not save settings. Try again.");
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const numRate = Number(rate);
    const numRmbRate = Number(rmbRate);
    if (!whatsappNumber.replace(/\D/g, "")) {
      toast.error("Enter a valid WhatsApp number.");
      return;
    }
    if (!numRate || numRate <= 0) {
      toast.error("Enter a valid USD exchange rate.");
      return;
    }
    if (!numRmbRate || numRmbRate <= 0) {
      toast.error("Enter a valid RMB exchange rate.");
      return;
    }
    const altDigits = whatsappNumberAlt.replace(/\D/g, "");
    if (altDigits && altDigits === whatsappNumber.replace(/\D/g, "")) {
      toast.error("The second line must be a different number.");
      return;
    }
    const next: Settings = {
      dealerName: dealerName.trim() || "Eclipse Motors",
      whatsappNumber: whatsappNumber.replace(/\D/g, ""),
      // Blank clears it — the second line is optional.
      whatsappNumberAlt: altDigits || undefined,
      ghsPerUsd: numRate,
      ghsPerRmb: numRmbRate,
    };
    // Changing a rate rewrites the advertised price of every listing that is
    // priced from its cost breakdown — show exactly what will move first.
    const rows =
      numRate !== settings.ghsPerUsd || numRmbRate !== settings.ghsPerRmb
        ? previewReprice(cars, {
            ghsPerRmb: numRmbRate,
            ghsPerUsd: numRate,
          })
        : [];
    if (rows.length > 0) {
      setPreview(rows);
      setPending(next);
      return;
    }
    void commit(next);
  };

  return (
    <div className="max-w-xl">
      <form
        onSubmit={save}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label>Dealership name</Label>
          <Input
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>WhatsApp number — main line</Label>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="233201234567"
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">
            International format, digits only (country code + number). Every
            &ldquo;Enquire&rdquo; button sends here.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>WhatsApp number — second line (optional)</Label>
          <Input
            value={whatsappNumberAlt}
            onChange={(e) => setWhatsappNumberAlt(e.target.value)}
            placeholder="233554981410"
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">
            Shown next to the main line so customers can reach whichever is
            free. Leave empty to show one number only.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>GHS → USD rate</Label>
          <Input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            1 USD = {rate || "?"} GHS. Example: a{" "}
            {formatPrice(500000, "GHS", Number(rate) || 1)} car shows as{" "}
            {formatPrice(500000, "USD", Number(rate) || 1)}. Also used for the
            shipping line in the vehicle cost breakdown.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>GHS → RMB rate</Label>
          <Input
            type="number"
            step="0.01"
            value={rmbRate}
            onChange={(e) => setRmbRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            1 RMB (¥) = {rmbRate || "?"} GHS. Pre-fills the cost breakdown when
            you add a vehicle; you can still override it on any single listing.
          </p>
        </div>

        <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Changing either rate re-prices every listing that is priced from its
          cost breakdown, so buyers always see today&rsquo;s cost. Listings
          priced by hand, and any listing whose rates you pinned, are left
          alone. You&rsquo;ll see exactly what changes before it is applied.
        </p>

        <div className="flex items-center justify-between border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </Button>
          <Button type="submit" variant="gold" disabled={saving || !hydrated}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Re-price {preview.length}{" "}
              {preview.length === 1 ? "listing" : "listings"}?
            </DialogTitle>
            <DialogDescription>
              These are the new prices buyers will see. Listings priced by hand
              or with pinned rates are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                {preview.map((row) => {
                  const up = row.newPriceGhs > row.oldPriceGhs;
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground line-through">
                        {formatPrice(row.oldPriceGhs, "GHS", settings.ghsPerUsd)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          up ? "text-gold" : "text-emerald-500"
                        }`}
                      >
                        {formatPrice(row.newPriceGhs, "GHS", settings.ghsPerUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              disabled={saving}
              onClick={() => pending && void commit(pending)}
            >
              {saving ? "Applying…" : "Apply new prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to seed data?</DialogTitle>
            <DialogDescription>
              This restores the original sample cars, discount codes and
              settings, and clears analytics and favourites on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetData();
                setDealerName("Eclipse Motors");
                setResetOpen(false);
                toast.success("Demo data reset");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
