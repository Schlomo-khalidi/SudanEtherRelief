import { TopBar } from "@/components/Brand";
import { Card, Chip, SectionLabel, Stamp } from "@/components/ui";

export default function RelayHubPage() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 860 }}>
        <Stamp>Relay hub</Stamp>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-.015em", margin: "16px 0 10px" }}>
          Hand the story to someone who will carry it.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginBottom: 28 }}>
          Pick a lane — mosque, campus, creators, diaspora — and receive a channel-ready kit
          (WhatsApp text, Instagram caption, share card, short-video script, English and Arabic)
          with your own tracked link. Your dashboard then shows your chain: views, clicks,
          confirmed donations.
        </p>
        <Card>
          <SectionLabel>Build status</SectionLabel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone="green">Lane network: in database</Chip>
            <Chip tone="green">Tracked links: live (/r/code)</Chip>
            <Chip tone="amber">Share-kit generator: arrives in Layer 5</Chip>
          </div>
          <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--ink-2)" }}>
            The plumbing is already live — every seeded relayer has a working tracked link.
            The self-serve kit UI ships next.
          </p>
        </Card>
      </main>
    </>
  );
}
