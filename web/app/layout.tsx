import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted fonts (web/fonts/) — no build-time network dependency, so
// Vercel/CI builds never fail on a Google Fonts fetch.
const fraunces = localFont({
  src: [{ path: "../fonts/Fraunces-Variable.ttf", weight: "100 900", style: "normal" }],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = localFont({
  src: [{ path: "../fonts/Inter-Variable.ttf", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexMono-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Witness Relay — news in. Donations out.",
  description:
    "Verified Sudan & East Africa news, human-approved, relayed through communities with attributed donations to Ethar Relief.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
