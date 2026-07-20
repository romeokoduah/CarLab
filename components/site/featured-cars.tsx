"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { BentoGrid } from "@/components/magicui/bento-grid";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FavouriteButton } from "@/components/site/favourite-button";
import { Price } from "@/components/site/price";
import { useStore } from "@/lib/store";
import { formatMileage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Car } from "@/lib/types";

function FeaturedTile({ car, large }: { car: Car; large?: boolean }) {
  const title = `${car.year} ${car.make} ${car.model}`;
  return (
    <MagicCard
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border border-border/70",
        large && "sm:col-span-2 sm:row-span-2",
      )}
    >
      {large && <BorderBeam duration={12} size={260} />}
      <Link href={`/car/${car.id}`} className="group block h-full">
        <div className="relative h-full w-full">
          <Image
            src={car.images[0]?.url}
            alt={title}
            fill
            sizes={large ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-1.5">
            {car.condition === "New" ? (
              <Badge variant="gold">New</Badge>
            ) : (
              <Badge
                variant="default"
                className="bg-black/50 text-white backdrop-blur"
              >
                {car.condition}
              </Badge>
            )}
            {car.verified && (
              <Badge
                variant="default"
                className="bg-black/50 text-emerald-300 backdrop-blur"
              >
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
                    large ? "text-2xl" : "text-lg",
                  )}
                >
                  {title}
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  {formatMileage(car.mileageKm)} ·{" "}
                  {car.transmission === "Automatic" ? "Automatic" : "Manual"} ·{" "}
                  {car.fuel}
                </p>
                <div className="mt-2 text-lg">
                  <Price ghs={car.priceGhs} className="text-white" />
                </div>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition-colors group-hover:bg-gold group-hover:text-black">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </MagicCard>
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
          <BlurFade>
            <p className="text-sm font-medium text-gold">Featured</p>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              This week&apos;s showroom picks
            </h2>
          </BlurFade>
        </div>
        <Link
          href="/inventory"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          View all <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {showSkeleton ? (
        <BentoGrid>
          <Skeleton className="h-full rounded-2xl sm:col-span-2 sm:row-span-2" />
          <Skeleton className="h-full rounded-2xl" />
          <Skeleton className="h-full rounded-2xl" />
          <Skeleton className="h-full rounded-2xl" />
          <Skeleton className="h-full rounded-2xl" />
        </BentoGrid>
      ) : (
        <BentoGrid>
          {featured.map((car, i) => (
            <BlurFade
              key={car.id}
              delay={i * 0.06}
              inView
              className={cn(i === 0 && "sm:col-span-2 sm:row-span-2")}
            >
              <FeaturedTile car={car} large={i === 0} />
            </BlurFade>
          ))}
        </BentoGrid>
      )}
    </section>
  );
}
