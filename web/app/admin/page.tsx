import Link from "next/link";
import { decide, runIngestNow, updateHeadline } from "@/app/admin/actions";
import { AdminShell } from "@/app/admin/AdminShell";
import { llmConfigured } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money, shortDate, wireDate } from "@/lib/format";
import type { DecisionRow, EventChainRow, EventRow, SourceRow, StoryPackRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = {
  in_review: 0,
  draft: 1,
  paused: 2,
  approved: 3,
  archived: 4,
};

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  in_review: { cls: "chip chip-amber", label: "Needs review" },
  draft: { cls: "chip", label: "Draft" },
  approved: { cls: "chip chip-green", label: "Published" },
  paused: { cls: "chip chip-navy", label: "Paused" },
  archived: { cls: "chip chip-red", label: "Rejected" },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    e?: string;
    ok?: string;
    err?: string;
    ingested?: string;
    attached?: string;
    candidates?: string;
    fetched?: string;
    newSlugs?: string;
    ingestErr?: string;
  }>;
}) {
  const {
    e: selectedId,
    ok,
    err,
    ingested,
    attached,
    candidates,
    fetched,
    newSlugs,
    ingestErr,
  } = await searchParams;
  const db = supabaseAdmin();

  const { data: events } = await db
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });
  const list = (events ?? []) as EventRow[];
  list.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  const ids = list.map((x) => x.id);

  const [sourcesRes, packsRes, decisionsRes, chainsRes, assetsRes] = await Promise.all([
    db.from("sources").select("id, event_id, outlet, is_field_report").in("event_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("story_packs").select("*").in("event_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).eq("status", "current"),
    db.from("editorial_decisions").select("*").in("event_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }),
    db.from("event_chain").select("*").in("event_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("assets").select("id, event_id, storage_path, meta").in("event_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const allSources = (sourcesRes.data ?? []) as Pick<SourceRow, "id" | "event_id" | "outlet" | "is_field_report">[];
  const allPacks = (packsRes.data ?? []) as StoryPackRow[];
  const allDecisions = (decisionsRes.data ?? []) as DecisionRow[];
  const allChains = (chainsRes.data ?? []) as EventChainRow[];
  const allAssets = (assetsRes.data ?? []) as { id: string; event_id: string; storage_path: string; meta: { caption?: string; credit?: string } }[];

  const flagsFor = (ev: EventRow, pack: StoryPackRow | null, srcCount: number, hasAsset: boolean): string[] => {
    const flags: string[] = [];
    if (!hasAsset) flags.push("imagery pending");
    if (pack) {
      if ((pack.claims ?? []).some((c) => !c.sourceIds || c.sourceIds.length === 0)) flags.push("unsourced claim");
      if ((pack.claims ?? []).some((c) => (c.sourceIds ?? []).length === 1)) flags.push("single-source claim");
    } else if (srcCount < 2) {
      flags.push(`only ${srcCount} source${srcCount === 1 ? "" : "s"}`);
    }
    return flags;
  };

  const selected = list.find((x) => x.id === selectedId) ?? list[0] ?? null;
  const selPack = selected ? allPacks.find((p) => p.event_id === selected.id) ?? null : null;
  const selSources = selected ? allSources.filter((s) => s.event_id === selected.id) : [];
  const selDecisions = selected ? allDecisions.filter((d) => d.event_id === selected.id) : [];
  const selChain = selected ? allChains.find((c) => c.event_id === selected.id) ?? null : null;

  const sourceIndex = new Map<string, number>();
  if (selected) selSources.forEach((s, i) => sourceIndex.set(s.id, i + 1));

  return (
    <AdminShell active="queue">
      <main className="wrap" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, padding: "24px 0 40px", alignItems: "start" }}>
        {/* ---------- ingest bar ---------- */}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
          <span className="chip chip-navy">{llmConfigured() ? "AI pipeline · live" : "AI pipeline · no key"}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            Wires + field feeds polled every 30 min; drafts land here source-bound, awaiting your decision.
          </span>
          <form action={runIngestNow} style={{ marginLeft: "auto" }}>
            <button className="btn btn-accent" type="submit">⟳ Run ingest now</button>
          </form>
          {ingested !== undefined ? (
            <span className="chip chip-green">✓ {ingested} new event(s) · {attached} source(s) attached · {candidates} candidates from {fetched} items</span>
          ) : null}
          {newSlugs ? <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{newSlugs}</span> : null}
          {ingestErr ? (
            <span className="chip chip-amber" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }} title={ingestErr}>
              ⚠ {ingestErr}
            </span>
          ) : null}
        </div>
        {/* ---------- queue ---------- */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "#fbf8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 13.5 }}>Review queue</b>
            <span className="chip chip-amber">{list.filter((x) => x.status === "in_review" || x.status === "draft").length} awaiting</span>
          </div>
          {list.map((ev) => {
            const pack = allPacks.find((p) => p.event_id === ev.id) ?? null;
            const flags = flagsFor(ev, pack, allSources.filter((s) => s.event_id === ev.id).length, allAssets.some((a) => a.event_id === ev.id));
            const chip = STATUS_CHIP[ev.status] ?? { cls: "chip", label: ev.status };
            return (
              <Link
                key={ev.id}
                href={`/admin?e=${ev.id}`}
                style={{
                  display: "block",
                  padding: "13px 16px",
                  borderBottom: "1px solid #f0ead9",
                  background: selected?.id === ev.id ? "var(--navy-soft)" : "transparent",
                  borderLeft: selected?.id === ev.id ? "3px solid var(--ink)" : "3px solid transparent",
                  textDecoration: "none",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{ev.headline}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                  <span className={chip.cls}>{chip.label}</span>
                  <span className="chip chip-navy">{allSources.filter((s) => s.event_id === ev.id).length} sources</span>
                  {flags.includes("imagery pending") ? <span className="chip chip-amber">imagery pending</span> : null}
                </div>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 6 }}>
                  {ev.slug} · updated {shortDate(ev.updated_at)}
                </div>
              </Link>
            );
          })}
          {list.length === 0 ? <div style={{ padding: 18, color: "var(--ink-3)", fontSize: 13 }}>No events yet — run the ingest.</div> : null}
        </div>

        {/* ---------- detail ---------- */}
        {selected ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)", background: "#fbf8f0", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span className="stamp" style={{ transform: "none" }}>{selPack ? `AI draft v${selPack.version}` : "Draft"}</span>
              <b className="serif" style={{ fontSize: 18 }}>{selected.slug}</b>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-3)" }}>
                {selected.is_demo ? "SAMPLE DATA · " : ""}updated {wireDate(selected.updated_at)}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px" }}>
              <div style={{ padding: "22px 24px", borderRight: "1px solid var(--line)" }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Headline (source-backed)</div>
                <form action={updateHeadline} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="eventId" value={selected.id} />
                  <input type="hidden" name="slug" value={selected.slug} />
                  <input
                    name="headline"
                    defaultValue={selected.headline}
                    className="serif"
                    style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 9, padding: "10px 13px", fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-display)" }}
                  />
                  <button className="btn btn-outline" type="submit">Save</button>
                </form>

                <div className="section-label" style={{ marginTop: 22, marginBottom: 8 }}>Claims {selPack ? `· AI confidence ${selPack.ai_confidence ?? "—"}` : ""}</div>
                {(selPack?.claims ?? []).map((c, i) => (
                  <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 15px", marginBottom: 10 }}>
                    <p style={{ fontSize: 14 }}>{c.text}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {(c.sourceIds ?? []).map((sid) => {
                        const n = sourceIndex.get(sid);
                        return n ? (
                          <span key={sid} className="src-pill">{`S${n} · ${selSources[n - 1]?.outlet}`}</span>
                        ) : (
                          <span key={sid} className="src-pill" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>missing source</span>
                        );
                      })}
                      {(c.sourceIds ?? []).length === 0 ? (
                        <span className="src-pill" style={{ background: "var(--accent-soft)", color: "var(--accent-dark)" }}>no source attached</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!selPack ? <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>No story pack yet — claims will appear after the AI draft step.</p> : null}

                <div className="section-label" style={{ marginTop: 18, marginBottom: 8 }}>Donation ask (Ethar-approved)</div>
                <div style={{ border: "1px solid var(--line)", background: "#fbf8f0", borderRadius: 10, padding: "13px 15px", fontSize: 13.5 }}>
                  {selected.donation_ask}
                  <div className="mono" style={{ fontSize: 9.5, color: selected.ethar_copy_locked ? "var(--green)" : "var(--amber)", marginTop: 8, letterSpacing: ".06em" }}>
                    {selected.ethar_copy_locked ? "✓ LOCKED — edits require Ethar sign-off" : "⚠ NOT LOCKED — needs Ethar sign-off before publish"}
                  </div>
                </div>

                <div className="section-label" style={{ marginTop: 18, marginBottom: 8 }}>Imagery</div>
                <div style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "13px 15px", fontSize: 13, color: "var(--ink-2)" }}>
                  Field asset pending — Ethar field imagery with credit gets attached in the asset step
                  (Layer 5). Policy: approved field imagery only, never AI-generated imagery of affected people.
                </div>

                <div className="section-label" style={{ marginTop: 22, marginBottom: 8 }}>Decision</div>
                <form action={decide}>
                  <input type="hidden" name="eventId" value={selected.id} />
                  <input type="hidden" name="slug" value={selected.slug} />
                  <input
                    name="note"
                    placeholder="Note for the log (required flavor for edit requests)"
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 13px", fontSize: 13, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-green btn-lg" name="action" value="approve" type="submit">✓ Approve &amp; publish</button>
                    <button className="btn btn-outline btn-lg" name="action" value="request_edit" type="submit">Request edit</button>
                    <button className="btn btn-outline btn-lg" name="action" value="pause" type="submit">Pause</button>
                    <button className="btn btn-danger btn-lg" name="action" value="reject" type="submit">Reject</button>
                  </div>
                </form>

                {ok || err ? (
                  <div style={{ marginTop: 14 }}>
                    {ok ? <span className="chip chip-green">✓ done: {ok}</span> : null}
                    {err ? <span className="chip chip-red">error: {err}</span> : null}
                  </div>
                ) : null}
              </div>

              <aside style={{ padding: 20, background: "#fbf8f0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Decision log</div>
                  <div style={{ borderLeft: "2px solid var(--line)", marginLeft: 6, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    {selDecisions.slice(0, 8).map((d) => (
                      <div key={d.id}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{d.actor} — {d.action}</div>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 2 }}>{wireDate(d.created_at)}</div>
                        {d.note ? <p style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 3 }}>{d.note}</p> : null}
                      </div>
                    ))}
                    {selDecisions.length === 0 ? <span style={{ fontSize: 12, color: "var(--ink-3)" }}>No decisions yet.</span> : null}
                  </div>
                </div>

                <div style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 12, padding: 14 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Chain (live)</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.9 }}>
                    views {selChain?.views ?? 0} · clicks {selChain?.clicks ?? 0}<br />
                    confirmed <b style={{ color: "var(--green)" }}>{money(selChain?.confirmed_amount)}</b> ({selChain?.confirmed_count ?? 0} gifts)<br />
                    pending reconciliation {selChain?.pending_count ?? 0}
                  </div>
                  <Link href={`/event/${selected.slug}`} target="_blank" style={{ fontSize: 12, color: "var(--accent-dark)", textDecoration: "none" }}>view public page ↗</Link>
                </div>

                <div className="card" style={{ padding: 14, borderRadius: 12 }}>
                  <div className="section-label" style={{ marginBottom: 8 }}>Publishing checklist</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5, color: "var(--ink-2)" }}>
                    <span>✅ Every claim carries a source</span>
                    <span>{selected.ethar_copy_locked ? "✅" : "⬜"} Donation copy locked by Ethar</span>
                    <span>⬜ Field imagery attached &amp; credited</span>
                    <span>⬜ Arabic kit render (auto on approve, Layer 5)</span>
                    <span>⬜ Lane notifications (auto on approve, Layer 5)</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="card card-pad" style={{ color: "var(--ink-3)" }}>Nothing to review yet.</div>
        )}
      </main>
    </AdminShell>
  );
}
