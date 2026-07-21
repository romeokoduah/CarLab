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
import { toast } from "sonner";

export function SettingsForm() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetData = useStore((s) => s.resetData);

  const [dealerName, setDealerName] = useState(settings.dealerName);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [rate, setRate] = useState(String(settings.ghsPerUsd));
  const [rmbRate, setRmbRate] = useState(String(settings.ghsPerRmb));
  const [resetOpen, setResetOpen] = useState(false);

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
    updateSettings({
      dealerName: dealerName.trim() || "Eclipse Motors",
      whatsappNumber: whatsappNumber.replace(/\D/g, ""),
      ghsPerUsd: numRate,
      ghsPerRmb: numRmbRate,
    });
    toast.success("Settings saved");
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
          <Label>WhatsApp number</Label>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="233201234567"
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">
            International format, digits only (country code + number). Used for
            every WhatsApp button.
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

        <div className="flex items-center justify-between border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </Button>
          <Button type="submit" variant="gold">
            <Save className="h-4 w-4" /> Save settings
          </Button>
        </div>
      </form>

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
