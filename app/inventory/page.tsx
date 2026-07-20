import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryClient } from "@/components/site/inventory-client";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { getCars } from "@/lib/api";

// Cars live in the database; render per-request and hand them to the client so
// the first paint already shows listings (no flash, and indexable by search).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Browse the full Eclipse Motors inventory. Filter by make, model, body type, price, year and more.",
};

export default async function InventoryPage() {
  const cars = await getCars();

  return (
    <Suspense
      fallback={
        <div className="container py-10">
          <CarGridSkeleton count={6} />
        </div>
      }
    >
      <InventoryClient initialCars={cars} />
    </Suspense>
  );
}
