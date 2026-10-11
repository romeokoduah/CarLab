"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CarSpecGroup } from "@/lib/types";

/**
 * Edits a car's "Full specifications" sheet: sections of label/value rows.
 * Empty rows and sections are fine while editing; normalizeSpecs drops them
 * when the car is saved.
 */
export function SpecsEditor({
  value,
  onChange,
}: {
  value: CarSpecGroup[];
  onChange: (next: CarSpecGroup[]) => void;
}) {
  const setGroup = (gi: number, next: CarSpecGroup | null) =>
    onChange(
      next ? value.map((g, i) => (i === gi ? next : g)) : value.filter((_, i) => i !== gi),
    );

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No full specifications yet. Importing a che168 listing fills these in, or add a
          section by hand.
        </p>
      )}

      {value.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={group.title}
              onChange={(e) => setGroup(gi, { ...group, title: e.target.value })}
              placeholder="Section, e.g. Dimensions & weight"
              className="font-medium"
              aria-label="Section title"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setGroup(gi, null)}
              aria-label={`Remove section ${group.title}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {group.rows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <Input
                  value={row.label}
                  onChange={(e) =>
                    setGroup(gi, {
                      ...group,
                      rows: group.rows.map((r, i) => (i === ri ? { ...r, label: e.target.value } : r)),
                    })
                  }
                  placeholder="Label"
                  className="w-2/5"
                  aria-label="Spec label"
                />
                <Input
                  value={row.value}
                  onChange={(e) =>
                    setGroup(gi, {
                      ...group,
                      rows: group.rows.map((r, i) => (i === ri ? { ...r, value: e.target.value } : r)),
                    })
                  }
                  placeholder="Value"
                  className="flex-1"
                  aria-label={`${row.label || "Spec"} value`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setGroup(gi, { ...group, rows: group.rows.filter((_, i) => i !== ri) })
                  }
                  aria-label={`Remove ${row.label || "row"}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              setGroup(gi, { ...group, rows: [...group.rows, { label: "", value: "" }] })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add row
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { title: "", rows: [{ label: "", value: "" }] }])}
      >
        <Plus className="mr-1 h-4 w-4" /> Add section
      </Button>
    </div>
  );
}
