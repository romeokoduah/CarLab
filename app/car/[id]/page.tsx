import type { Metadata } from "next";
import { CarDetail } from "@/components/site/car-detail";
import { getCarById } from "@/lib/api";
import { dbGetSettings } from "@/lib/db/settings";

// Dynamic: cars live in the database and change at runtime (admin edits), so
// detail pages render per-request rather than being prebuilt.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const car = await getCarById(params.id);
  if (!car) return { title: "Car not found" };
  const title = `${car.year} ${car.make} ${car.model}`;
  return {
    title,
    description: car.description.slice(0, 155),
    openGraph: {
      title,
      description: car.description.slice(0, 155),
      images: car.images[0]?.url ? [car.images[0].url] : undefined,
    },
  };
}

export default async function CarPage({
  params,
}: {
  params: { id: string };
}) {
  const [car, settings] = await Promise.all([
    getCarById(params.id),
    dbGetSettings(),
  ]);
  return (
    <CarDetail id={params.id} initialCar={car} initialSettings={settings} />
  );
}
