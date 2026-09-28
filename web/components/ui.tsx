import type { ReactNode } from "react";

export function Chip({
  tone = "default",
  children,
}: {
  tone?: "default" | "green" | "red" | "amber" | "navy";
  children: ReactNode;
}) {
  const cls = tone === "default" ? "chip" : `chip chip-${tone}`;
  return <span className={cls}>{children}</span>;
}

export function Stamp({ children }: { children: ReactNode }) {
  return <span className="stamp">{children}</span>;
}

export function Dateline({ children }: { children: ReactNode }) {
  return <div className="dateline">{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

export function StatTile({
  num,
  label,
  tone,
}: {
  num: string;
  label: string;
  tone?: "green";
}) {
  return (
    <div className="stat-tile">
      <div className="stat-num" style={tone === "green" ? { color: "var(--green)" } : undefined}>
        {num}
      </div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export function Card({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  return <div className={`card${pad ? " card-pad" : ""}`}>{children}</div>;
}
