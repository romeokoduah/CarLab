import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryClient } from "@/components/site/inventory-client";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Browse the full Eclipse Motors inventory. Filter by make, model, body type, price, year and more.",
};

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10">
          <CarGridSkeleton count={6} />
        </div>
      }
    >
      <InventoryClient />
    </Suspense>
  );
}
