"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { CarGrid } from "@/components/site/car-grid";
import { CarGridSkeleton } from "@/components/site/car-card-skeleton";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";

export default function FavouritesPage() {
  const mounted = useMounted();
  const cars = useStore((s) => s.cars);
  const favourites = useStore((s) => s.favourites);

  const saved = cars.filter((c) => favourites.includes(c.id));

  return (
    <div className="container py-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Favourites
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mounted
            ? saved.length > 0
              ? `${saved.length} car${saved.length === 1 ? "" : "s"} saved on this device`
              : "Cars you save appear here — no account needed."
            : "Loading your saved cars…"}
        </p>
      </div>

      {!mounted ? (
        <CarGridSkeleton count={3} />
      ) : saved.length > 0 ? (
        <CarGrid cars={saved} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">No favourites yet</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Tap the heart on any car to save it here for later. Your list stays
            on this device.
          </p>
          <Button asChild variant="gold" className="mt-6">
            <Link href="/inventory">
              Browse inventory <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
