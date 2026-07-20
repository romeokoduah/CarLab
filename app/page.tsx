import { Hero } from "@/components/site/hero";
import { StatsBand } from "@/components/site/stats-band";
import { FeaturedCars } from "@/components/site/featured-cars";
import { BrandMarquee } from "@/components/site/brand-marquee";
import { HowItWorks } from "@/components/site/how-it-works";
import { CtaBand } from "@/components/site/cta-band";
import { getCars } from "@/lib/api";

// Cars come from the database, so render per-request. Passing them down as
// initial data means the first paint already has content — no skeleton->empty
// ->content flash, and the listings are in the HTML for search engines.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cars = await getCars();

  return (
    <>
      <Hero />
      <StatsBand initialCars={cars} />
      <FeaturedCars initialCars={cars} />
      <BrandMarquee />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
