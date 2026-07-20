"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Gauge,
  Cog,
  Fuel as FuelIcon,
  Palette,
  Car as CarIcon,
  ShieldCheck,
  Check,
  Zap,
  Cpu,
  Users,
  DoorOpen,
  Compass,
  FileCheck,
  UserRound,
} from "lucide-react";
import { Gallery } from "@/components/site/gallery";
import { DiscountBox } from "@/components/site/discount-box";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { FavouriteButton } from "@/components/site/favourite-button";
import { StatusBadge } from "@/components/site/status-badge";
import { Price } from "@/components/site/price";
import { CarCard } from "@/components/site/car-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { formatMileage } from "@/lib/utils";
import { getSessionKey, sendBeacon } from "@/lib/customer";
import type { Car, DiscountResult } from "@/lib/types";

export function CarDetail({
  id,
  initialCar,
}: {
  id: string;
  initialCar?: Car;
}) {
  const storeCars = useStore((s) => s.cars);
  const hydrated = useStore((s) => s.hydrated);
  const recordEvent = useStore((s) => s.recordEvent);
  const viewed = useRef(false);
  const [discount, setDiscount] = useState<DiscountResult | null>(null);

  // The server already resolved this car, so it paints immediately; once the
  // store has loaded we prefer it so admin edits appear without a reload.
  const car = (hydrated ? storeCars.find((c) => c.id === id) : undefined)
    ?? initialCar;

  useEffect(() => {
    if (car && !viewed.current) {
      viewed.current = true;
      recordEvent(car.id, "view");
      // Server-side view count. Sent from the browser so crawlers don't inflate
      // it, keyed by an anonymous token (never an IP).
      sendBeacon("/api/events", {
        carId: car.id,
        type: "view",
        sessionKey: getSessionKey(),
      });
    }
  }, [car, recordEvent]);

  if (!car && !hydrated && !initialCar) return <DetailSkeleton />;

  if (!car) {
    return (
      <div className="container flex flex-col items-center py-32 text-center">
        <CarIcon className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Car not found</h1>
        <p className="mt-2 text-muted-foreground">
          This listing may have been sold or removed.
        </p>
        <Link
          href="/inventory"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to inventory
        </Link>
      </div>
    );
  }

  const title = `${car.year} ${car.make} ${car.model}`;
  const finalGhs = discount?.ok ? discount.finalPrice : undefined;

  const specs: { icon: typeof Calendar; label: string; value: string }[] = [
    { icon: Calendar, label: "Year", value: String(car.year) },
    { icon: Gauge, label: "Mileage", value: formatMileage(car.mileageKm) },
    { icon: Cog, label: "Transmission", value: car.transmission },
    { icon: FuelIcon, label: "Fuel", value: car.fuel },
    ...(car.engineCapacity
      ? [{ icon: Zap, label: "Engine", value: car.engineCapacity }]
      : []),
    ...(car.drivetrain
      ? [{ icon: Compass, label: "Drivetrain", value: car.drivetrain }]
      : []),
    ...(car.cylinders
      ? [{ icon: Cpu, label: "Cylinders", value: String(car.cylinders) }]
      : []),
    ...(car.horsepower
      ? [{ icon: Gauge, label: "Power", value: `${car.horsepower} bhp` }]
      : []),
    { icon: CarIcon, label: "Body", value: car.bodyType },
    ...(car.seats
      ? [{ icon: Users, label: "Seats", value: String(car.seats) }]
      : []),
    ...(car.doors
      ? [{ icon: DoorOpen, label: "Doors", value: String(car.doors) }]
      : []),
    { icon: Palette, label: "Colour", value: car.colour },
    { icon: ShieldCheck, label: "Condition", value: car.condition },
    ...(car.registrationStatus
      ? [{ icon: FileCheck, label: "Registration", value: car.registrationStatus }]
      : []),
    ...(car.previousOwners != null
      ? [
          {
            icon: UserRound,
            label: "Previous owners",
            value: String(car.previousOwners),
          },
        ]
      : []),
  ];

  // "Similar cars" needs the whole catalogue, which only exists once the store
  // has hydrated; it sits below the fold so filling in slightly later is fine.
  const similar = (hydrated ? storeCars : [])
    .filter(
      (c) =>
        c.id !== car.id &&
        c.status !== "Sold" &&
        (c.bodyType === car.bodyType || c.make === car.make),
    )
    .slice(0, 3);

  return (
    <div className="container py-6 md:py-10">
      <Link
        href="/inventory"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inventory
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        {/* Left: gallery + details */}
        <div>
          <Gallery images={car.images} title={title} videoUrl={car.videoUrl} />

          <div className="mt-8">
            <h2 className="text-lg font-semibold">Overview</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {car.description}
            </p>
          </div>

          {/* Specs */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Specifications</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-card p-3.5"
                >
                  <s.icon className="h-4 w-4 text-gold" />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="text-sm font-medium">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          {car.features.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Features</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {car.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: sticky purchase panel */}
        <div>
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={car.status} />
                    {car.verified && (
                      <Badge variant="success">
                        <BadgeCheck className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                    {title}
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {car.bodyType} · {formatMileage(car.mileageKm)}
                  </p>
                </div>
                <FavouriteButton carId={car.id} carTitle={title} />
              </div>

              <div className="mt-4 text-3xl">
                <Price ghs={car.priceGhs} discountedGhs={finalGhs} />
              </div>

              <div className="mt-4">
                <DiscountBox car={car} onApplied={setDiscount} />
              </div>

              <div className="mt-4 space-y-2">
                <WhatsAppButton
                  car={car}
                  finalPriceGhs={finalGhs}
                  discountCode={discount?.ok ? discount.code?.code : undefined}
                  size="lg"
                  fullWidth
                  label="Enquire on WhatsApp"
                />
                <p className="text-center text-xs text-muted-foreground">
                  Opens WhatsApp with this car&apos;s details pre-filled.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar cars */}
      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Similar vehicles
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="container py-10">
      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-8 h-24 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
