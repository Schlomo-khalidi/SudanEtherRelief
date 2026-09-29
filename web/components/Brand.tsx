"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function BrandSeal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="#ff8a75" strokeWidth="2" />
      <circle
        cx="17"
        cy="17"
        r="10.5"
        fill="none"
        stroke="#ff8a75"
        strokeWidth="1"
        strokeDasharray="3 2.4"
      />
      <path
        d="M12 17.5l3.4 3.4L22.5 13.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark() {
  return (
    <a className="brand" href="/">
      <BrandSeal />
      <span className="brand-name">
        Witness <em>Relay</em>
      </span>
    </a>
  );
}

export function BroadcastIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" fill="#fff" />
      <path
        d="M7.2 7.2a6.8 6.8 0 000 9.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M16.8 7.2a6.8 6.8 0 010 9.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MegaphoneIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 10.2v3.6c0 .6.4 1.1 1 1.1h2.2l4.3 3.9c.6.6 1.5.1 1.5-.7V5.9c0-.8-.9-1.3-1.5-.7L6.2 9.1H4c-.6 0-1 .5-1 1.1z"
        fill="#fff"
      />
      <path
        d="M15.2 9a4.4 4.4 0 010 6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17.8 6.5a8 8 0 010 11"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5.5l6.5 6.5L9 18.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: "/",
    label: "Live feed",
    match: (p: string) => p === "/" || p.startsWith("/event"),
  },
  { href: "/relay", label: "Relay hub", match: (p: string) => p.startsWith("/relay") },
  { href: "/impact", label: "Impact", match: (p: string) => p.startsWith("/impact") },
  {
    href: "/how-it-works",
    label: "How it works",
    match: (p: string) => p.startsWith("/how-it-works"),
  },
];

export function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <BrandMark />
        <nav className="topnav">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} className={item.match(pathname ?? "/") ? "active" : ""} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <a className="btn btn-accent" href="/relay">
            <MegaphoneIcon />
            <span className="hide-sm">Relay this news</span>
            <span className="show-sm">Relay</span>
            <ChevronRight />
          </a>
          <button
            className={`burger${open ? " open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <div className={`m-drawer${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="m-top">
          <BrandMark />
          <button className="m-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <nav className="m-links">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} className={item.match(pathname ?? "/") ? "active" : ""} href={item.href}>
              {item.label}
              <span className="m-arrow">→</span>
            </a>
          ))}
        </nav>
        <div className="m-foot">
          <a className="btn btn-accent btn-lg" href="/relay" style={{ justifyContent: "center" }}>
            <MegaphoneIcon />
            Relay this news
          </a>
          <p className="mono">
            News in — donations out. Every link attributed, every claim sourced.
          </p>
        </div>
      </div>
    </header>
  );
}
