"use client";

import confetti from "canvas-confetti";

/** Celebration burst used when a discount code is successfully applied. */
export function fireConfetti() {
  const end = Date.now() + 900;
  // Brand blue, a lighter and a deeper step of it, plus white. Fired over both
  // themes, so nothing here may be so dark it vanishes on the near-black one.
  const colors = ["#1324A4", "#6A81F0", "#ffffff", "#3D52D5"];

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
