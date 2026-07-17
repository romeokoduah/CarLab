"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Message shown when the typed value isn't in the list. */
  addHint?: string;
  disabled?: boolean;
}

/**
 * Styled, searchable combobox that also accepts free text (add-new).
 * A better mobile experience than a native <datalist>: the panel is width-
 * matched to the field, height-capped and scrollable, with large tap targets —
 * so long option lists never fill the whole window.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  addHint = "Add",
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = options
    .filter((o) => o.toLowerCase().includes(q))
    .slice(0, 60);
  const exact = options.some((o) => o.toLowerCase() === q);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          className="pr-9"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && filtered[active]) {
              e.preventDefault();
              pick(filtered[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-0 top-0 grid h-10 w-9 place-items-center text-muted-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (filtered.length > 0 || (q && !exact)) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 shadow-lg">
          {q && !exact && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground">
              {addHint} “{value.trim()}”
            </div>
          )}
          {filtered.map((o, i) => (
            <button
              type="button"
              key={o}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                i === active ? "bg-accent" : "hover:bg-accent",
              )}
            >
              {o}
              {o.toLowerCase() === q && <Check className="h-4 w-4 text-gold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
