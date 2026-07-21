"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarImage } from "@/lib/types";

interface GalleryProps {
  images: CarImage[];
  title: string;
  videoUrl?: string;
}

export function Gallery({ images, title, videoUrl }: GalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const go = useCallback(
    (dir: 1 | -1) => {
      setActive((i) => (i + dir + count) % count);
    },
    [count],
  );

  // keyboard nav in lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, go]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const activeImage = images[active];

  return (
    <div>
      {/* Main image */}
      <div
        // max-h keeps the photo from eating a whole tall desktop screen.
        className="group relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-2xl border border-border bg-secondary sm:aspect-[16/10]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {showVideo && videoUrl ? (
          <iframe
            src={videoUrl}
            title={`${title} walkaround`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src={activeImage.url}
              alt={activeImage.alt || `${title} — photo ${active + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <button
              onClick={() => setLightbox(true)}
              aria-label="Open full-screen gallery"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/70"
            >
              <Expand className="h-4 w-4" />
            </button>

            {count > 1 && (
              <>
                <NavArrow dir="left" onClick={() => go(-1)} />
                <NavArrow dir="right" onClick={() => go(1)} />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
                  {active + 1} / {count}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className={cn(
              "relative grid aspect-[4/3] h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-black/60 text-white transition sm:h-16 sm:w-24",
              showVideo ? "border-gold" : "border-transparent",
            )}
            aria-label="Play video walkaround"
          >
            <Play className="h-5 w-5" />
            <span className="absolute bottom-1 left-1.5 text-[10px]">Video</span>
          </button>
        )}
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => {
              setActive(i);
              setShowVideo(false);
            }}
            aria-label={`View photo ${i + 1}`}
            className={cn(
              "relative aspect-[4/3] h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-16 sm:w-24",
              i === active && !showVideo
                ? "border-gold"
                : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            <Image
              src={img.url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} gallery`}
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {active + 1} / {count}
            </span>
            <button
              onClick={() => setLightbox(false)}
              aria-label="Close gallery"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="relative flex-1"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt || `${title} — photo ${active + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {count > 1 && (
              <>
                <NavArrow dir="left" onClick={() => go(-1)} light />
                <NavArrow dir="right" onClick={() => go(1)} light />
              </>
            )}
          </div>
          {/*
            The inner `w-max mx-auto` centres a short strip but still lets a
            long one scroll from its true start — `justify-center` on the
            scroller itself would put the first thumbnails out of reach.
          */}
          <div className="overflow-x-auto p-4 no-scrollbar">
            <div className="mx-auto flex w-max gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActive(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={cn(
                    "relative aspect-[4/3] h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                    i === active ? "border-gold" : "border-transparent opacity-60",
                  )}
                >
                  <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavArrow({
  dir,
  onClick,
  light,
}: {
  dir: "left" | "right";
  onClick: () => void;
  light?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full transition-colors",
        dir === "left" ? "left-3" : "right-3",
        light
          ? "bg-white/10 text-white hover:bg-white/20"
          : // Always visible on touch screens, which have no hover to reveal it.
            "bg-black/50 text-white hover:bg-black/70 lg:opacity-0 lg:group-hover:opacity-100",
      )}
    >
      {dir === "left" ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );
}
