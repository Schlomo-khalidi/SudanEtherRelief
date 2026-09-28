"use client";

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
            Relay this news
          </a>
        </div>
      </div>
    </header>
  );
}
