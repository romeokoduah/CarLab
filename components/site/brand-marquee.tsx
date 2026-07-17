import { Marquee } from "@/components/magicui/marquee";

const BRANDS = [
  "Toyota",
  "Mercedes-Benz",
  "BMW",
  "Land Rover",
  "Honda",
  "Ford",
  "Tesla",
  "Volkswagen",
  "Audi",
  "Lexus",
  "Nissan",
  "Hyundai",
];

export function BrandMarquee() {
  return (
    <section className="border-y border-border py-10">
      <p className="container mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Trusted marques, sourced and verified
      </p>
      <div className="relative">
        <Marquee pauseOnHover className="[--duration:38s]">
          {BRANDS.map((b) => (
            <span
              key={b}
              className="mx-6 select-none whitespace-nowrap text-xl font-semibold tracking-tight text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              {b}
            </span>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}
