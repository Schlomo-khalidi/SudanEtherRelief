import { TopBar } from "@/components/Brand";
import { Card, Chip, Dateline, SectionLabel, Stamp, StatTile } from "@/components/ui";

export default function Home() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 60 }}>
        <div className="dateline">Layer 0 scaffold · foundations live</div>
        <h1 className="serif" style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-.015em", margin: "14px 0 10px", maxWidth: 760, lineHeight: 1.12 }}>
          Witness Relay is being built here.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 640, marginBottom: 32 }}>
          Verified Sudan &amp; East Africa news, human-approved, relayed through
          communities with attributed donations to Ethar Relief. The live feed
          lands in Layer 3 — the design system and data contract are already in.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
          <StatTile num="0" label="Approved events (seed pending)" />
          <StatTile num="0" label="Relayers onboarded" />
          <StatTile num="$0" label="Confirmed donations" tone="green" />
        </div>

        <Card>
          <SectionLabel>Design system check</SectionLabel>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            <Stamp>Witness verified</Stamp>
            <Chip tone="navy">3 sources</Chip>
            <Chip tone="green">Editor-approved</Chip>
            <Chip tone="amber">Field report</Chip>
            <Chip>Editor-approved · A. Osman · 12:02 UTC</Chip>
          </div>
          <Dateline>Zamzam Camp, North Darfur — 24 Sept 2026 · 14:20 UTC</Dateline>
          <p className="serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25, marginTop: 8 }}>
            Famine confirmed in Zamzam displacement camp as access remains blocked
          </p>
        </Card>
      </main>
    </>
  );
}
