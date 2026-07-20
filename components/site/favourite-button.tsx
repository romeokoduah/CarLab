"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface Props {
  carId: string;
  carTitle?: string;
  className?: string;
  size?: "sm" | "md";
}

export function FavouriteButton({ carId, carTitle, className, size = "md" }: Props) {
  const mounted = useMounted();
  const isFav = useStore((s) => s.favourites.includes(carId));
  const toggle = useStore((s) => s.toggleFavourite);
  const active = mounted && isFav;

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(carId);
        toast(active ? "Removed from favourites" : "Saved to favourites", {
          description: carTitle,
        });
      }}
      className={cn(
        // Solid rather than blurred: these scroll with the page, and a
        // backdrop blur forces a re-composite on every frame.
        "grid place-items-center rounded-full border border-border/60 bg-background/90 transition-all hover:scale-105 active:scale-95",
        size === "md" ? "h-9 w-9" : "h-8 w-8",
        className,
      )}
    >
      <Heart
        className={cn(
          "transition-colors",
          size === "md" ? "h-[1.05rem] w-[1.05rem]" : "h-4 w-4",
          active ? "fill-gold text-gold" : "text-foreground",
        )}
      />
    </button>
  );
}
