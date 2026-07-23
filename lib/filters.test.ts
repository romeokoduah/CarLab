import { test } from "node:test";
import assert from "node:assert/strict";
import { seededShuffle, sortCars } from "@/lib/filters";
import type { Car } from "@/lib/types";

const ids = Array.from({ length: 20 }, (_, i) => String(i));

test("the same seed always gives the same order", () => {
  assert.deepEqual(seededShuffle(ids, 12345), seededShuffle(ids, 12345));
});

test("different seeds give different orders", () => {
  assert.notDeepEqual(seededShuffle(ids, 1), seededShuffle(ids, 2));
});

test("a shuffle keeps every element exactly once", () => {
  const out = seededShuffle(ids, 999);
  assert.equal(out.length, ids.length);
  assert.deepEqual([...out].sort(), [...ids].sort());
});

test("shuffling actually reorders (not the identity)", () => {
  const out = seededShuffle(ids, 42);
  assert.notDeepEqual(out, ids);
});

test("shuffle does not mutate its input", () => {
  const input = [...ids];
  seededShuffle(input, 7);
  assert.deepEqual(input, ids);
});

test("'featured' sort leaves the caller's order untouched", () => {
  const cars = [
    { id: "a", createdAt: "2020-01-01T00:00:00Z", priceGhs: 3 },
    { id: "b", createdAt: "2026-01-01T00:00:00Z", priceGhs: 1 },
    { id: "c", createdAt: "2023-01-01T00:00:00Z", priceGhs: 2 },
  ] as Car[];
  assert.deepEqual(
    sortCars(cars, "featured").map((c) => c.id),
    ["a", "b", "c"],
  );
  // Newest still reorders by createdAt, so the two are genuinely different.
  assert.deepEqual(
    sortCars(cars, "newest").map((c) => c.id),
    ["b", "c", "a"],
  );
});
