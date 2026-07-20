import { CarCard } from "@/components/site/car-card";
import type { Car } from "@/lib/types";

/**
 * Plain grid. Cards previously animated in on scroll, which meant every card
 * entering the viewport triggered work mid-scroll — the main cause of stutter
 * on long inventory lists.
 */
export function CarGrid({ cars }: { cars: Car[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
