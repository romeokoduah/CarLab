import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryClient } from "@/components/site/inventory-client";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { getCarsSafe } from "@/lib/api";

// Cars live in the database; render per-request and hand them to the client so
// the first paint already shows listings (no flash, and indexable by search).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Browse the full Eclipse Motors inventory. Filter by make, model, body type, price, year and more.",
};

export default async function InventoryPage() {
  // See getCarsSafe: a database fault must not take the page down.
  const { cars, degraded } = await getCarsSafe();

  return (
    <>
      {degraded && (
        // An empty grid would read as "this dealer has no cars", which is a lie
        // and costs a sale. Say plainly that it is our fault, and keep the
        // WhatsApp route open so the visit is not wasted.
        <div className="container pt-6">
          <p
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            We can&apos;t load the inventory right now — this is a problem on our
            side, not a sign that stock is unavailable. Please message us on
            WhatsApp and we&apos;ll send you what&apos;s currently available.
          </p>
        </div>
      )}
      <Suspense
        fallback={
          <div className="container py-10">
            <CarGridSkeleton count={6} />
          </div>
        }
      >
        <InventoryClient initialCars={cars} />
      </Suspense>
    </>
  );
}
