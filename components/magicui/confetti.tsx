"use client";

import confetti from "canvas-confetti";

/** Celebration burst used when a discount code is successfully applied. */
export function fireConfetti() {
  const end = Date.now() + 900;
  const colors = ["#C9A15E", "#E7CC8F", "#ffffff", "#B8860B"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      startVelocity: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      startVelocity: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors,
    scalar: 0.9,
  });
}
