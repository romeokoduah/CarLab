"use client";

import { useState } from "react";
import { Tag, Check, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/site/price";
import { fireConfetti } from "@/components/magicui/confetti";
import { applyDiscount } from "@/lib/discounts";
import { useStore } from "@/lib/store";
import type { Car, DiscountResult } from "@/lib/types";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Props {
  car: Car;
  onApplied: (result: DiscountResult | null) => void;
}

export function DiscountBox({ car, onApplied }: Props) {
  const discounts = useStore((s) => s.discounts);
  const recordEvent = useStore((s) => s.recordEvent);
  const rate = useStore((s) => s.settings.ghsPerUsd);
  const currency = useStore((s) => s.currency);

  const [code, setCode] = useState("");
  const [result, setResult] = useState<DiscountResult | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyDiscount(code, car, discounts);
    setResult(res);
    if (res.ok) {
      onApplied(res);
      fireConfetti();
    } else {
      onApplied(null);
    }
  };

  const clear = () => {
    setCode("");
    setResult(null);
    onApplied(null);
  };

  const applied = result?.ok ? result : null;

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4 text-gold" />
        Have a discount code?
      </div>

      {!applied ? (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (result) setResult(null);
            }}
            placeholder="e.g. SHOWROOM10"
            aria-label="Discount code"
            aria-invalid={result && !result.ok ? true : undefined}
            className={cn(
              "uppercase",
              result && !result.ok && "border-destructive",
            )}
          />
          <Button type="submit" variant="gold" className="shrink-0">
            Apply
          </Button>
        </form>
      ) : (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              <Check className="h-4 w-4" /> {applied.code?.code} applied
            </span>
            <button
              onClick={clear}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove discount code"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-xl">
            <Price ghs={applied.originalPrice} discountedGhs={applied.finalPrice} />
          </div>
          <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
            You save {formatPrice(applied.savedAmount, currency, rate)}
          </p>
        </div>
      )}

      {result && !result.ok && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {result.error}
        </p>
      )}
    </div>
  );
}
