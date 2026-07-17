import type { Metadata } from "next";
import { CarDetail } from "@/components/site/car-detail";
import { getAllCarIds, getCarById } from "@/lib/api";

export function generateStaticParams() {
  return getAllCarIds().map((id) => ({ id }));
}

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

export default function CarPage({ params }: { params: { id: string } }) {
  return <CarDetail id={params.id} />;
}
