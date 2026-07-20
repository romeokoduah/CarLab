"use client";

import Image from "next/image";
import Link from "next/link";
import { Gauge, Fuel as FuelIcon, Cog, Images, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavouriteButton } from "@/components/site/favourite-button";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { Price } from "@/components/site/price";
import { StatusBadge } from "@/components/site/status-badge";
import { formatMileage } from "@/lib/utils";
import type { Car } from "@/lib/types";

export function CarCard({ car }: { car: Car }) {
  const cover = car.images[0]?.url;
  const title = `${car.year} ${car.make} ${car.model}`;
  const sold = car.status === "Sold";

  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 transition-shadow duration-300 hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)]">
      <div className="relative aspect-[16/11] overflow-hidden">
        <Link href={`/car/${car.id}`} aria-label={title} className="block h-full w-full">
            {cover && (
              <Image
                src={cover}
                alt={title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </Link>

        {/* top-left badges */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={car.status} />
          {car.condition === "New" && <Badge variant="gold">New</Badge>}
        </div>

        {/* top-right actions */}
        <div className="absolute right-3 top-3">
          <FavouriteButton carId={car.id} carTitle={title} />
        </div>

        {/* bottom overlays */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Badge
            variant="default"
            className="bg-black/60 text-white backdrop-blur-md"
          >
            <Images className="h-3 w-3" /> {car.images.length}
          </Badge>
          {car.verified && (
            <Badge
              variant="default"
              className="bg-black/60 text-emerald-300 backdrop-blur-md"
            >
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/car/${car.id}`}>
              <h3 className="truncate text-[15px] font-semibold tracking-tight">
                {title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {car.bodyType} · {car.colour}
            </p>
          </div>
        </div>

        <div className="mt-3 text-lg">
          <Price ghs={car.priceGhs} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-gold" />
            {formatMileage(car.mileageKm)}
          </span>
          <span className="flex items-center gap-1.5">
            <Cog className="h-3.5 w-3.5 text-gold" />
            {car.transmission === "Automatic" ? "Auto" : "Manual"}
          </span>
          <span className="flex items-center gap-1.5">
            <FuelIcon className="h-3.5 w-3.5 text-gold" />
            {car.fuel}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <WhatsAppButton
            car={car}
            size="sm"
            fullWidth
            label={sold ? "Source similar" : "WhatsApp"}
          />
          <Link
            href={`/car/${car.id}`}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-border px-3.5 text-[13px] font-medium transition-colors hover:bg-accent"
          >
            Details
          </Link>
        </div>
      </div>
    </Card>
  );
}
