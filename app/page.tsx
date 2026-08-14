import { Hero } from "@/components/site/hero";
import { StatsBand } from "@/components/site/stats-band";
import { FeaturedCars } from "@/components/site/featured-cars";
import { BrandMarquee } from "@/components/site/brand-marquee";
import { HowItWorks } from "@/components/site/how-it-works";
import { RequestACar } from "@/components/site/request-a-car";
import { CtaBand } from "@/components/site/cta-band";
import { getCarsSafe } from "@/lib/api";

// Cars come from the database, so render per-request. Passing them down as
// initial data means the first paint already has content — no skeleton->empty
// ->content flash, and the listings are in the HTML for search engines.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // getCarsSafe, not getCars: if the database is unreachable the homepage still
  // has to load. Losing the listings is bad; losing the contact details and the
  // whole site is worse. The failure is logged server-side.
  const { cars } = await getCarsSafe();

  return (
    <>
      <Hero />
      <StatsBand initialCars={cars} />
      <FeaturedCars initialCars={cars} />
      <BrandMarquee />
      <HowItWorks />
      <RequestACar />
      <CtaBand />
    </>
  );
}
