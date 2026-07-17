import { Hero } from "@/components/site/hero";
import { StatsBand } from "@/components/site/stats-band";
import { FeaturedCars } from "@/components/site/featured-cars";
import { BrandMarquee } from "@/components/site/brand-marquee";
import { HowItWorks } from "@/components/site/how-it-works";
import { CtaBand } from "@/components/site/cta-band";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBand />
      <FeaturedCars />
      <BrandMarquee />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
