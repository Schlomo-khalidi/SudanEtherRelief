import Link from "next/link";
import { TopBar } from "@/components/Brand";
import { supabaseAdmin, supabasePublic } from "@/lib/supabase/server";
import { money, num } from "@/lib/format";
import type { EventChainRow, EventRow, LaneChainRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const anon = supabasePublic();
  const admin = supabaseAdmin();

  const [chainsRes, eventsRes, lanesRes, relayersRes, lanesCountRes, linksRes, viewsRes, clicksRes, attrsRes] =
    await Promise.all([
      anon.from("event_chain").select("*").order("views", { ascending: false }),
      anon.from("events").select("id, slug, headline, location_label, status").eq("status", "approved"),
      anon.from("event_lane_chain").select("*"),
      anon.from("relayers").select("id, display_name, optin_leaderboard"),
      anon.from("relay_lanes").select("id", { count: "exact", head: true }),
      admin.from("share_links").select("id, relayer_id, event_id"),
      admin.from("link_views").select("share_link_id"),
      admin.from("donation_clicks").select("share_link_id"),
      admin.from("donation_attributions").select("share_link_id, amount").eq("status", "confirmed"),
    ]);

  const chains = (chainsRes.data ?? []) as EventChainRow[];
  const events = (eventsRes.data ?? []) as { id: string; slug: string; headline: string; location_label: string | null; status: string }[];
  const laneChains = (lanesRes.data ?? []) as LaneChainRow[];
  const relayers = (relayersRes.data ?? []) as { id: string; display_name: string; optin_leaderboard: boolean }[];

  const chainsByEvent = new Map(chains.map((c) => [c.event_id, c]));

  // ---- global totals (sum of per-event chains — reproducible by SQL) ----
  const totals = chains.reduce(
    (acc, c) => ({
      views: acc.views + Number(c.views ?? 0),
      clicks: acc.clicks + Number(c.clicks ?? 0),
      confirmed: acc.confirmed + Number(c.confirmed_amount ?? 0),
      confirmedCount: acc.confirmedCount + Number(c.confirmed_count ?? 0),
      pending: acc.pending + Number(c.pending_count ?? 0),
    }),
    { views: 0, clicks: 0, confirmed: 0, confirmedCount: 0, pending: 0 },
  );

  // ---- top lanes (aggregate lane chains across events) ----
  const laneAgg = new Map<string, { name: string; views: number; clicks: number; confirmed: number }>();
  for (const l of laneChains) {
    const cur = laneAgg.get(l.lane_id) ?? { name: l.lane_name, views: 0, clicks: 0, confirmed: 0 };
    cur.views += Number(l.views ?? 0);
    cur.clicks += Number(l.clicks ?? 0);
    cur.confirmed += Number(l.confirmed_amount ?? 0);
    laneAgg.set(l.lane_id, cur);
  }
  const topLanes = [...laneAgg.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.confirmed - a.confirmed || b.views - a.views)
    .slice(0, 8);

  // ---- relayer leaderboard (opt-in only) ----
  const links = (linksRes.data ?? []) as { id: string; relayer_id: string; event_id: string }[];
  const viewsByLink = new Map<string, number>();
  for (const v of viewsRes.data ?? []) {
    const k = (v as { share_link_id: string }).share_link_id;
    viewsByLink.set(k, (viewsByLink.get(k) ?? 0) + 1);
  }
  const clicksByLink = new Map<string, number>();
  for (const c of clicksRes.data ?? []) {
    const k = (c as { share_link_id: string }).share_link_id;
    clicksByLink.set(k, (clicksByLink.get(k) ?? 0) + 1);
  }
  const confirmedByLink = new Map<string, number>();
  for (const a of attrsRes.data ?? []) {
    const k = (a as { share_link_id: string; amount: number | null }).share_link_id;
    confirmedByLink.set(k, (confirmedByLink.get(k) ?? 0) + Number(a.amount ?? 0));
  }
  const linkToRelayer = new Map(links.map((l) => [l.id, l]));

  const boardRows = relayers
    .filter((r) => r.optin_leaderboard)
    .map((r) => {
      const myLinks = links.filter((l) => l.relayer_id === r.id);
      const mine = myLinks.map((l) => l.id);
      return {
        name: r.display_name,
        events: new Set(myLinks.map((l) => l.event_id)).size,
        views: mine.reduce((a, id) => a + (viewsByLink.get(id) ?? 0), 0),
        clicks: mine.reduce((a, id) => a + (clicksByLink.get(id) ?? 0), 0),
        confirmed: mine.reduce((a, id) => a + (confirmedByLink.get(id) ?? 0), 0),
      };
    })
    .filter((r) => r.events > 0)
    .sort((a, b) => b.confirmed - a.confirmed || b.views - a.views)
    .slice(0, 10);

  const maxLaneViews = Math.max(1, ...topLanes.map((l) => l.views));

  return (
    <>
      <TopBar />

      <div className="livebar">
        <div className="wrap livebar-inner">
          <div className="live-item"><b>{num(events.length)}</b><span>Approved events</span></div>
          <div className="live-item"><b>{num(relayers.length)}</b><span>Relayers</span></div>
          <div className="live-item"><b>{num(totals.views)}</b><span>Tracked views</span></div>
          <div className="live-item"><b>{num(totals.clicks)}</b><span>Give clicks</span></div>
          <div className="live-item"><b><em>{money(totals.confirmed)}</em></b><span>Confirmed donations</span></div>
          <div className="live-item"><b>{num(totals.pending)}</b><span>Pending reconciliation</span></div>
        </div>
      </div>

      <main className="wrap" style={{ paddingTop: 34, paddingBottom: 50 }}>
        <div className="head" style={{ maxWidth: 820 }}>
          <span className="stamp">Impact — on the record</span>
          <h1 className="serif" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-.01em", margin: "14px 0 8px" }}>
            Every number here is provable.
          </h1>
          <p style={{ color: "var(--ink-2)", fontSize: 14.5 }}>
            This board aggregates the same SQL that powers each event&apos;s chain — nothing is
            estimated. <b>Confirmed</b> donations come only from payment references or approved
            reconciliation; everything else is labeled a tracked click. {totals.pending > 0 ? (
              <>Right now {totals.pending} gift{totals.pending === 1 ? "" : "s"} sit pending reconciliation.</>
            ) : null}
          </p>
        </div>

        {/* events on the record */}
        <section style={{ marginTop: 26 }}>
          <div className="section-label">Events on the record</div>
          <div className="card">
            <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Event</th><th>Lanes</th><th>Relayers</th><th>Views</th><th>Clicks</th><th>Confirmed</th><th>Pending</th></tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const c = chainsByEvent.get(ev.id);
                  return (
                    <tr key={ev.id}>
                      <td>
                        <Link href={`/event/${ev.slug}`} style={{ textDecoration: "none" }}>
                          <b style={{ fontSize: 13 }}>{ev.headline}</b>
                        </Link>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{(ev.location_label ?? "").toUpperCase()}</div>
                      </td>
                      <td className="mono">{c?.lanes_count ?? 0}</td>
                      <td className="mono">{c?.relayers_count ?? 0}</td>
                      <td className="mono">{num(c?.views ?? 0)}</td>
                      <td className="mono">{num(c?.clicks ?? 0)}</td>
                      <td><b className="mono" style={{ color: "var(--green)" }}>{money(c?.confirmed_amount ?? 0)}</b> <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>({c?.confirmed_count ?? 0})</span></td>
                      <td className="mono" style={{ color: "var(--amber)" }}>{c?.pending_count ?? 0}</td>
                    </tr>
                  );
                })}
                {events.length === 0 ? (
                  <tr><td colSpan={7} style={{ color: "var(--ink-3)" }}>No approved events yet.</td></tr>
                ) : null}
              </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="kit-grid" style={{ marginTop: 26 }}>
          {/* top lanes */}
          <section>
            <div className="section-label">Top lanes — who moves the story</div>
            <div className="card" style={{ padding: "6px 0" }}>
              <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Lane</th><th>Views</th><th>Clicks</th><th>Confirmed</th><th style={{ width: 120 }}>Share of views</th></tr>
                </thead>
                <tbody>
                  {topLanes.length === 0 ? (
                    <tr><td colSpan={5} style={{ color: "var(--ink-3)" }}>No lanes carrying yet.</td></tr>
                  ) : (
                    topLanes.map((l) => (
                      <tr key={l.id}>
                        <td><b style={{ fontSize: 13 }}>{l.name}</b></td>
                        <td className="mono">{num(l.views)}</td>
                        <td className="mono">{num(l.clicks)}</td>
                        <td><b className="mono" style={{ color: "var(--green)" }}>{money(l.confirmed)}</b></td>
                        <td>
                          <div className="lane-table bar" style={{ margin: 0 }}>
                            <i style={{ width: `${Math.round((l.views / maxLaneViews) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </section>

          {/* leaderboard */}
          <section>
            <div className="section-label">Relayer leaderboard — opt-in</div>
            <div className="card" style={{ padding: "6px 0" }}>
              <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Relayer</th><th>Events</th><th>Views</th><th>Confirmed</th></tr>
                </thead>
                <tbody>
                  {boardRows.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: "var(--ink-3)" }}>No relayers on the board yet.</td></tr>
                  ) : (
                    boardRows.map((r, i) => (
                      <tr key={r.name}>
                        <td>
                          <b style={{ fontSize: 13 }}>{i + 1}. {r.name}</b>
                        </td>
                        <td className="mono">{r.events}</td>
                        <td className="mono">{num(r.views)}</td>
                        <td><b className="mono" style={{ color: "var(--green)" }}>{money(r.confirmed)}</b></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8 }}>
              Relayers appear here only if they opted in. Every figure traces back to their tracked
              links — ask anyone on this board to defend their number and they can.
            </p>
          </section>
        </div>

        <div className="foot">
          <span>Witness Relay — a visibility engine for Sudan &amp; East Africa. News in. Donations out.</span>
          <span className="sample-tag">◐ Prototype · {chains.length} approved events · {links.length} tracked links issued</span>
        </div>
      </main>
    </>
  );
}
