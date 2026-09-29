"use client";

import { useEffect, useRef } from "react";

export type LiveStat = { value: string; label: string; accent?: boolean; dot: string };

/**
 * Mobile: infinite marquee of KPI cards (seamless via cloned copies), pauses
 * permanently on the first user interaction (touch/wheel) so the visitor scrolls
 * freely with snap. Desktop: renders the plain divider row — untouched.
 */
export function LivebarCards({ stats }: { stats: LiveStat[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const mq = window.matchMedia("(max-width: 760px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stopped = false;
    const clones: Element[] = [];

    const cloneCards = () => {
      const originals = [...rail.children].filter((c) => !(c as HTMLElement).dataset.clone);
      for (const c of originals) {
        const clone = c.cloneNode(true) as HTMLElement;
        clone.dataset.clone = "1";
        clone.setAttribute("aria-hidden", "true");
        rail.appendChild(clone);
        clones.push(clone);
      }
    };
    const removeClones = () => {
      clones.forEach((c) => c.remove());
      clones.length = 0;
      rail.scrollLeft = 0;
    };

    const startAuto = () => {
      if (reduced || stopped) return;
      rail.style.scrollSnapType = "none"; // snap fights the per-tick advance
      cloneCards();
      let last = performance.now();
      // interval (not rAF): background tabs throttle rAF to zero, which would
      // stall the marquee entirely; 16ms ticks read smoothly in the foreground
      const iv = window.setInterval(() => {
        if (stopped) {
          window.clearInterval(iv);
          return;
        }
        const now = performance.now();
        const dt = Math.min(1000, now - last);
        last = now;
        rail.scrollLeft += (30 * dt) / 1000; // 30px/s on any device
        const half = rail.scrollWidth / 2;
        if (rail.scrollLeft >= half) rail.scrollLeft -= half; // seamless wrap
      }, 16);
    };

    const stopAuto = () => {
      if (stopped) return;
      stopped = true;
      rail.style.scrollSnapType = "x mandatory";
      const half = rail.scrollWidth / 2;
      if (rail.scrollLeft >= half) rail.scrollLeft -= half;
    };

    const onInteract = () => stopAuto();
    const onMqChange = () => {
      stopAuto();
      removeClones();
    };

    if (mq.matches) startAuto();
    rail.addEventListener("pointerdown", onInteract);
    rail.addEventListener("wheel", onInteract, { passive: true });
    mq.addEventListener("change", onMqChange);

    return () => {
      stopped = true;
      rail.removeEventListener("pointerdown", onInteract);
      rail.removeEventListener("wheel", onInteract);
      mq.removeEventListener("change", onMqChange);
      removeClones();
    };
  }, []);

  return (
    <div className="wrap livebar-inner" ref={railRef}>
      {stats.map((s) => (
        <div className={`live-item${s.accent ? " accent" : ""}`} key={s.label}>
          <span className="live-dot" style={{ background: s.dot }} />
          <b>{s.accent ? <em>{s.value}</em> : s.value}</b>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
