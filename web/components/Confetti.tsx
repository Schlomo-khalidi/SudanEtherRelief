"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const COLORS = ["#221c44", "#e8442e", "#1e7f4f", "#f6f1e5", "#ff8a75"];

/** Clean brand-colored celebration, ~2.5s of life, honors reduced-motion. */
export function Confetti({ fire }: { fire: boolean }) {
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const opts = { colors: COLORS, disableForReducedMotion: true };

    // one centered burst
    confetti({ ...opts, particleCount: 80, spread: 95, startVelocity: 38, origin: { y: 0.6 }, scalar: 0.9 });

    // side cannons for a little over 1.5s — particles keep falling through ~2.5s
    const end = Date.now() + 1600;
    const iv = setInterval(() => {
      confetti({ ...opts, particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ ...opts, particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() > end) clearInterval(iv);
    }, 200);

    return () => clearInterval(iv);
  }, [fire]);

  return null;
}
