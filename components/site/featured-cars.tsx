"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FavouriteButton } from "@/components/site/favourite-button";
import { Price } from "@/components/site/price";
import { useStore } from "@/lib/store";
import { formatMileage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Car } from "@/lib/types";

/**
 * Static tiles: no mouse-tracked gradients or looping border beams. The only
 * motion is a cheap transform on hover, which never runs while scrolling.
 */
function FeaturedTile({ car, large }: { car: Car; large?: boolean }) {
  const title = `${car.year} ${car.make} ${car.model}`;
  return (
    <Link
      href={`/car/${car.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-gold/40",
        large ? "sm:col-span-2 sm:row-span-2" : "",
      )}
    >
      <div className={cn("relative w-full", large ? "aspect-[4/3]" : "aspect-[4/3]")}>
        <Image
          src={car.images[0]?.url}
          alt={title}
          fill
          sizes={
            large
              ? "(max-width: 768px) 100vw, 66vw"
              : "(max-width: 768px) 100vw, 33vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-1.5">
          {car.condition === "New" ? (
            <Badge variant="gold">New</Badge>
          ) : (
            <Badge variant="default" className="bg-black/60 text-white">
              {car.condition}
            </Badge>
          )}
          {car.verified && (
            <Badge variant="default" className="bg-black/60 text-emerald-300">
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
        </div>
        <div className="absolute right-4 top-4">
          <FavouriteButton carId={car.id} carTitle={title} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={cn(
                  "truncate font-semibold tracking-tight",
                  large ? "text-xl sm:text-2xl" : "text-lg",
                )}
              >
                {title}
              </h3>
              <p className="mt-1 text-sm text-white/70">
                {formatMileage(car.mileageKm)} · {car.transmission} · {car.fuel}
              </p>
              <div className="mt-2 text-lg">
                <Price ghs={car.priceGhs} className="text-white" />
              </div>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 transition-colors group-hover:bg-gold group-hover:text-black">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCars({ initialCars = [] }: { initialCars?: Car[] }) {
  const storeCars = useStore((s) => s.cars);
  const hydrated = useStore((s) => s.hydrated);

  // Server-provided cars render immediately and match the first client render;
  // once the store has loaded we switch to it so admin edits show live.
  const cars = hydrated ? storeCars : initialCars;
  const featured = cars.filter((c) => c.status !== "Sold").slice(0, 5);
  const showSkeleton = !hydrated && initialCars.length === 0;

  return (
    <section className="container py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Featured
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            This week&apos;s picks
          </h2>
        </div>
        <Link
          href="/inventory"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          View all <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {showSkeleton
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "aspect-[4/3] rounded-xl",
                  i === 0 && "sm:col-span-2 sm:row-span-2",
                )}
              />
            ))
          : featured.map((car, i) => (
              <FeaturedTile key={car.id} car={car} large={i === 0} />
            ))}
      </div>
    </section>
  );
}
