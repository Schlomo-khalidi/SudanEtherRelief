import { redirect } from "next/navigation";
import { join } from "@/app/relay/actions";
import { TopBar } from "@/components/Brand";
import { Card, Chip, SectionLabel } from "@/components/ui";
import { getRelayerId } from "@/lib/relayer-auth";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RelayPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  if (await getRelayerId()) redirect("/relay/me");

  const anon = supabasePublic();
  const [{ data: lanes }, membersRes] = await Promise.all([
    anon.from("relay_lanes").select("id, name, type, region").order("created_at"),
    anon.from("lane_members").select("lane_id"),
  ]);
  const counts = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    counts.set((m as { lane_id: string }).lane_id, (counts.get((m as { lane_id: string }).lane_id) ?? 0) + 1);
  }
  const laneList = (lanes ?? []) as { id: string; name: string; type: string; region: string | null }[];

  return (
    <>
      <TopBar />
      <div className="relay-hero">
        <div className="wrap relay-hero-inner">
          <div>
            <h1>
              Hand the story to someone who will <em>carry it.</em>
            </h1>
            <p>
              Choose the community you can reach. We hand you a channel-ready kit — caption, card,
              and a link that is yours alone. When people act, your chain shows exactly what moved.
            </p>
          </div>
          <form action={join} className="join-card" id="join">
            <div className="section-label" style={{ marginBottom: 10 }}>Join a lane</div>
            {e ? (
              <div className="chip chip-red" style={{ marginBottom: 10 }}>Something was missing — try again</div>
            ) : null}
            <input name="name" placeholder="Your name" required />
            <input name="email" type="email" placeholder="Your email (identifies your dashboard)" required />
            <select name="laneId" defaultValue="">
              <option value="" disabled>
                Pick your relay lane…
              </option>
              {laneList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <input name="newLane" placeholder="…or start a new lane (group, masjid, cohort)" />
            <button className="btn btn-accent btn-lg" style={{ width: "100%", justifyContent: "center" }} type="submit">
              Become a relayer →
            </button>
            <p className="mono" style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 10, textAlign: "center" }}>
              Email is only used to identify your dashboard — no spam, ever
            </p>
          </form>
        </div>
      </div>

      <main className="wrap" style={{ paddingTop: 40, paddingBottom: 50 }}>
        <div className="section-label">The lanes already carrying</div>
        <div className="lanes">
          {laneList.map((l) => (
            <div className="lane" key={l.id}>
              <b>{l.name}</b>
              <p>{l.region ?? "Sudan & East Africa network"}</p>
              <div className="meta">
                <span>{l.type}</span>
                <span>{counts.get(l.id) ?? 0} relayer{(counts.get(l.id) ?? 0) === 1 ? "" : "s"}</span>
              </div>
            </div>
          ))}
        </div>

        <Card>
          <SectionLabel>How the relay works</SectionLabel>
          <div className="how-grid">
            <div>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--accent-dark)", marginBottom: 5 }}>01 · PICK</div>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Choose an approved event and your lane.</p>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--accent-dark)", marginBottom: 5 }}>02 · KIT</div>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Get a channel-ready kit — WhatsApp text, Instagram caption, share cards, video script, EN + AR — with your personal tracked link and QR.</p>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "var(--accent-dark)", marginBottom: 5 }}>03 · PROVE</div>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Your dashboard shows your chain: views → clicks → confirmed donations. Provably yours, never estimated.</p>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: "10px 8px" }}>
            <Chip tone="green">Every claim pre-sourced</Chip>
            <Chip tone="green">Every kit editor-approved</Chip>
            <Chip tone="amber">Say “confirmed” only for confirmed donations</Chip>
          </div>
        </Card>
      </main>
    </>
  );
}
