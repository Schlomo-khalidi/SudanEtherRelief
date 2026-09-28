import { TopBar } from "@/components/Brand";
import { Card, SectionLabel, Stamp } from "@/components/ui";

const STEPS = [
  { k: "01 · Collect", t: "Wires and field reports (Radio Dabanga, Sudan Tribune, ReliefWeb, UN OCHA, GDELT, Ethar staff memos) are polled continuously and clustered into events by an AI pipeline that may only use cited text." },
  { k: "02 · Approve", t: "Nothing publishes without a human editor: every claim must keep its source attached, donation copy is locked by Ethar Relief, imagery is field-only. Every decision is logged." },
  { k: "03 · Relay", t: "Approved stories become Witness Cards handed to opted-in lanes — mosques, campuses, creators, diaspora — each relayer with a personal tracked link and channel-ready kit." },
  { k: "04 · Attribute", t: "Tracked views, Give clicks and confirmed donations flow into a public chain per event. 'Confirmed' means a payment reference or approved reconciliation — never an estimate." },
];

export default function HowItWorksPage() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 860 }}>
        <Stamp>How it works</Stamp>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-.015em", margin: "16px 0 10px" }}>
          News in. Donations out. Nothing in between that we can&apos;t prove.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginBottom: 28 }}>
          Witness Relay exists because when Sudan leaves the news cycle, giving stops while the
          need does not. This is the loop that keeps it visible — and keeps us honest about it.
        </p>
        {STEPS.map((s) => (
          <Card key={s.k} style={{ marginBottom: 14 }}>
            <SectionLabel>{s.k}</SectionLabel>
            <p style={{ fontSize: 14.5, color: "var(--ink)" }}>{s.t}</p>
          </Card>
        ))}
      </main>
    </>
  );
}
