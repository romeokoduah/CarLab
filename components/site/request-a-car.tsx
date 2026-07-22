"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getStoredReference, storeReference } from "@/lib/customer";

/**
 * "Can't find it? We'll source it" — a request form on the landing page for
 * buyers who want a car we don't have listed.
 *
 * Submits to /api/car-requests, which files it against the customer's lead
 * record so the reference they get back is the same one used everywhere else.
 */
export function RequestACar() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [known, setKnown] = useState<string | null>(null);

  // Returning customers file the request against their existing record.
  useEffect(() => setKnown(getStoredReference()), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/car-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          consent,
          make,
          model,
          budgetGhs: budget.replace(/[^\d]/g, ""),
          notes,
          reference: known ?? undefined,
        }),
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

  return (
    <section className="container pb-8">
      <div className="rounded-2xl border border-border bg-card p-7 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* Pitch */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              <Clock className="h-3.5 w-3.5" />
              Reply within 24 hours
            </span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Can&apos;t find it? Tell us what to look for.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Send us the make, model and budget you have in mind. We&apos;ll
              search, price it landed in Ghana and come back to you within 24
              hours — on WhatsApp or by email, whichever you prefer.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              {[
                "Sourced and inspected before it ships",
                "Landed price quoted in cedis",
                "Import duty estimated separately",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Form, or the reference once it's in */}
          {issued ? (
            <div className="flex flex-col justify-center rounded-xl border border-gold/40 bg-gold/5 p-7 text-center">
              <p className="text-lg font-semibold">Request received</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ll be in touch within 24 hours. Keep this reference —
                quote it any time you contact us.
              </p>
              <p className="mt-5 font-mono text-3xl font-semibold tracking-[0.15em] text-gold">
                {issued}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(issued);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="mx-auto mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy reference
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Make" htmlFor="rq-make">
                  <Input
                    id="rq-make"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Toyota"
                  />
                </Field>
                <Field label="Model" htmlFor="rq-model">
                  <Input
                    id="rq-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Corolla"
                  />
                </Field>
              </div>

              <Field label="Budget (GHS)" htmlFor="rq-budget" optional>
                <Input
                  id="rq-budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 150000"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Anything else?" htmlFor="rq-notes" optional>
                <Textarea
                  id="rq-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Year range, colour, transmission, must-have features…"
                  rows={2}
                />
              </Field>

              <div className="border-t border-border pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" htmlFor="rq-name">
                    <Input
                      id="rq-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="WhatsApp number" htmlFor="rq-phone">
                    <Input
                      id="rq-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0554981410"
                      inputMode="tel"
                      required
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Email" htmlFor="rq-email">
                    <Input
                      id="rq-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I agree to be contacted about this request. See our{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    privacy notice
                  </Link>
                  .
                </span>
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                <Search className="h-4 w-4" />
                {busy ? "Sending…" : "Send my request"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
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
