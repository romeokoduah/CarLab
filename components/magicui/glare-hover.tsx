"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlareHoverProps {
  children: React.ReactNode;
  className?: string;
  glareColor?: string;
}

/** Wraps content and sweeps a soft glare across it on hover. */
export function GlareHover({
  children,
  className,
  glareColor = "rgba(255,255,255,0.35)",
}: GlareHoverProps) {
  return (
    <div className={cn("group relative overflow-hidden", className)}>
      {children}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full -skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${glareColor}, transparent)`,
        }}
      />
    </div>
  );
}
