import type { Metadata } from "next";
import { CarDetail } from "@/components/site/car-detail";
import { getAllCarIds, getCarById } from "@/lib/api";

// Sentinel route that renders a universal, client-hydrated car shell. nginx
// serves this page for any /car/<id>/ that wasn't prebuilt (e.g. cars added in
// the admin after build); the client reads the real id from the URL.
const FALLBACK_ID = "_view";

export function generateStaticParams() {
  return [...getAllCarIds(), FALLBACK_ID].map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (params.id === FALLBACK_ID) return { title: "Car details" };
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
