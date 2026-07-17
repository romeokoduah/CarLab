"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { RetroGrid } from "@/components/magicui/retro-grid";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { SITE_CONFIG } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <RetroGrid className="opacity-60" />
      <div className="showroom-vignette pointer-events-none absolute inset-0" />

      <div className="container relative flex flex-col items-center py-24 text-center md:py-36">
        <BlurFade delay={0.05}>
          <Badge
            variant="gold"
            className="mb-6 px-3 py-1 text-[11px] uppercase tracking-[0.15em]"
          >
            <Sparkles className="h-3 w-3" /> {SITE_CONFIG.location} showroom
          </Badge>
        </BlurFade>

        <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          The car you want,{" "}
          <AuroraText className="font-semibold">without the guesswork</AuroraText>
        </h1>

        <TextAnimate
          as="p"
          by="word"
          delay={0.2}
          className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
        >
          Hand-picked, fully inspected vehicles with transparent pricing. Browse
          the showroom and reach us on WhatsApp for a same-day viewing.
        </TextAnimate>

        <BlurFade delay={0.5} className="mt-9">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/inventory">
              <ShimmerButton className="h-12 px-8 text-[15px]">
                Explore inventory
                <ArrowRight className="h-4 w-4" />
              </ShimmerButton>
            </Link>
            <Link
              href="/inventory?cond=New"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-7 text-[15px] font-medium transition-colors hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4 text-gold" />
              New arrivals
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
