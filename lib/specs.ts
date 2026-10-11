import type { CarSpecGroup } from "@/lib/types";

const MAX_GROUPS = 12;
const MAX_ROWS = 40;
const MAX_LABEL = 80;
const MAX_VALUE = 200;

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * A car's full specification sheet in a safe, bounded shape.
 *
 * It comes from the importer, the admin form or straight off an API body, and
 * it is rendered on the public car page, so anything that isn't a titled group
 * of text label/value rows is dropped, as are empty rows, empty groups and
 * duplicate labels within a group.
 */
export function normalizeSpecs(input: unknown): CarSpecGroup[] {
  if (!Array.isArray(input)) return [];
  const groups: CarSpecGroup[] = [];
  for (const g of input) {
    if (typeof g !== "object" || g === null) continue;
    const { title, rows } = g as { title?: unknown; rows?: unknown };
    const t = clean(title, MAX_LABEL);
    if (!t || !Array.isArray(rows)) continue;
    const seen = new Set<string>();
    const kept = [];
    for (const r of rows) {
      if (typeof r !== "object" || r === null) continue;
      const label = clean((r as { label?: unknown }).label, MAX_LABEL);
      const value = clean((r as { value?: unknown }).value, MAX_VALUE);
      if (!label || !value || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      kept.push({ label, value });
      if (kept.length >= MAX_ROWS) break;
    }
    if (kept.length) groups.push({ title: t, rows: kept });
    if (groups.length >= MAX_GROUPS) break;
  }
  return groups;
}
