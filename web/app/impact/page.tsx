import { TopBar } from "@/components/Brand";
import { Card, Chip, SectionLabel, Stamp } from "@/components/ui";

export default function ImpactPage() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 860 }}>
        <Stamp>Impact</Stamp>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-.015em", margin: "16px 0 10px" }}>
          Every number here is provable.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginBottom: 28 }}>
          The global impact board — totals, top lanes, relayer leaderboard — aggregates the same
          SQL that powers each event&apos;s chain. Confirmed donations only ever come from payment
          references or approved reconciliation; everything else is labeled a tracked click.
        </p>
        <Card>
          <SectionLabel>Build status</SectionLabel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone="green">Per-event chains: live</Chip>
            <Chip tone="amber">Global board + leaderboard: arrives in Layer 7</Chip>
          </div>
        </Card>
      </main>
    </>
  );
}
