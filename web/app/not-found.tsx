import Link from "next/link";
import { TopBar } from "@/components/Brand";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
        <div className="dateline" style={{ justifyContent: "center" }}>404 — not on the record</div>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 600, margin: "12px 0 10px" }}>
          This page isn&apos;t part of a verified story.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 520, margin: "0 auto 24px" }}>
          The event you&apos;re looking for may be paused, unapproved, or mistyped — we only publish
          what survives editorial review.
        </p>
        <Link className="btn btn-accent btn-lg" href="/">Back to the live feed →</Link>
      </main>
    </>
  );
}
