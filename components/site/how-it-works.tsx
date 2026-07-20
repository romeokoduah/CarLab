import { Search, MessageCircle, KeyRound } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Browse the showroom",
    body: "Filter by make, budget, body type and more. Every listing shows full specs, real photos and transparent pricing in GHS or USD.",
  },
  {
    icon: MessageCircle,
    title: "Chat on WhatsApp",
    body: "Tap enquire and we open WhatsApp with the car details pre-filled. Ask questions, apply a discount code, or book a viewing in seconds.",
  },
  {
    icon: KeyRound,
    title: "Inspect & drive away",
    body: "Come see the car, take a test drive and complete the paperwork. We handle registration and hand you the keys.",
  },
];

export function HowItWorks() {
  return (
    <section className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
          How buying works
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Three simple steps to your next car
        </h2>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="relative h-full rounded-xl border border-border bg-card p-7"
          >
            <span className="absolute right-6 top-6 text-5xl font-semibold tabular-nums text-muted/40">
              0{i + 1}
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
