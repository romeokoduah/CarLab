"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { storeReference } from "@/lib/customer";

type Mode = "new" | "returning";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carId: string;
  /** Builds the WhatsApp URL once we know the customer's reference. */
  buildHref: (reference: string) => string;
}

export function EnquiryGate({ open, onOpenChange, carId, buildHref }: Props) {
  const [mode, setMode] = useState<Mode>("new");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, email, consent, carId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      storeReference(data.reference);
      setIssued(data.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submitReturning = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: refInput, carId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      storeReference(data.reference);
      setIssued(data.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // Once we have a reference the final action is a plain link, so the browser
  // treats opening WhatsApp as a direct user gesture (no popup blocking).
  if (issued) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You&apos;re all set</DialogTitle>
            <DialogDescription>
              This is your reference. Keep it — quote it any time you contact us
              and we can pull up your enquiries, or hold a car for you.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-gold/40 bg-gold/5 px-5 py-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Your reference
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.15em] text-gold">
              {issued}
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(issued);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            We&apos;ve added it to your WhatsApp message too, so it stays in your
            chat history.
          </p>

          <Button asChild variant="whatsapp" className="w-full">
            <a
              href={buildHref(issued)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
            >
              <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
              Continue to WhatsApp
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Before we connect you</DialogTitle>
          <DialogDescription>
            A few details so we can follow up properly — you&apos;ll only be
            asked once on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["new", "returning"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={
                "flex-1 rounded-md px-3 py-2 text-sm transition-colors " +
                (mode === m
                  ? "bg-gold/10 font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m === "new" ? "First time" : "I have a reference"}
            </button>
          ))}
        </div>

        {mode === "new" ? (
          <form onSubmit={submitNew} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eg-name">Full name</Label>
              <Input
                id="eg-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Kwame Mensah"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eg-phone">WhatsApp / call number</Label>
              <Input
                id="eg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eg-email">Email</Label>
              <Input
                id="eg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <span>
                I agree that Eclipse Motors may contact me about this vehicle and
                store these details for that purpose. See our{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-gold underline-offset-4 hover:underline"
                >
                  privacy notice
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={busy}
            >
              {busy ? "Just a moment…" : "Get my reference & continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitReturning} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eg-ref">Your reference</Label>
              <Input
                id="eg-ref"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                placeholder="A7K2-9QMX"
                className="font-mono tracking-[0.15em]"
                autoCapitalize="characters"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                It looks like <span className="font-mono">A7K2-9QMX</span> — we
                sent it in your last WhatsApp message.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={busy}
            >
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
          We only use these details to respond to your enquiry. We never sell or
          share them.
        </p>
      </DialogContent>
    </Dialog>
  );
}
