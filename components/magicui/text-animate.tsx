"use client";

import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

interface TextAnimateProps {
  children: string;
  className?: string;
  delay?: number;
  duration?: number;
  by?: "word" | "character";
  as?: "p" | "span" | "div";
  once?: boolean;
}

/** Lightweight staggered text reveal (word or character). */
export function TextAnimate({
  children,
  className,
  delay = 0,
  duration = 0.4,
  by = "word",
  as = "p",
  once = true,
}: TextAnimateProps) {
  const segments = by === "word" ? children.split(/(\s+)/) : children.split("");
  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.045, delayChildren: delay },
    },
  };
  const child: Variants = {
    hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration },
    },
  };
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={cn(className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
    >
      {segments.map((seg, i) =>
        seg.trim() === "" ? (
          <span key={i}>{seg}</span>
        ) : (
          <motion.span
            key={i}
            variants={child}
            className="inline-block"
          >
            {seg}
          </motion.span>
        ),
      )}
    </MotionTag>
  );
}
