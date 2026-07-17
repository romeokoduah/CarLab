"use client";

import { BlurFade } from "@/components/magicui/blur-fade";
import { CarCard } from "@/components/site/car-card";
import type { Car } from "@/lib/types";

export function CarGrid({ cars }: { cars: Car[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car, i) => (
        <BlurFade key={car.id} delay={Math.min(i, 8) * 0.05} inView>
          <CarCard car={car} />
        </BlurFade>
      ))}
    </div>
  );
}
