import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryClient } from "@/components/site/inventory-client";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { getCarsSafe } from "@/lib/api";

// Same per-request rendering as /inventory: the stock lives in the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ready in Ghana",
  description:
    "Cars already in Ghana with Eclipse Motors — come and see them, test drive and drive away, with no shipping wait.",
};

export default async function ReadyInGhanaPage() {
  // See getCarsSafe: a database fault must not take the page down.
  const { cars, degraded } = await getCarsSafe();

  return (
    <>
      {degraded && (
        <div className="container pt-6">
          <p
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            We can&apos;t load our cars right now — this is a problem on our
            side, not a sign that stock is unavailable. Please message us on
            WhatsApp and we&apos;ll send you what&apos;s currently in Ghana.
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
        <InventoryClient
          // Only ship the cars this page shows; the client narrows the store
          // the same way once it loads.
          initialCars={cars.filter((c) => c.inGhana)}
          basePath="/ready-in-ghana"
          title="Ready in Ghana"
          intro="These cars are already here — no shipping, no waiting. Come and see them, take a test drive and drive away."
          onlyInGhana
        />
      </Suspense>
    </>
  );
}
