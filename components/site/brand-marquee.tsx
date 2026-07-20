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

/**
 * Static marque list. This was previously an infinite marquee, which kept the
 * compositor busy permanently and made scrolling stutter on mobile.
 */
export function BrandMarquee() {
  return (
    <section className="border-y border-border py-12">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted marques, sourced and verified
        </p>
        <ul className="mt-8 grid grid-cols-3 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {BRANDS.map((b) => (
            <li
              key={b}
              className="text-center text-sm font-medium tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground sm:text-base"
            >
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
