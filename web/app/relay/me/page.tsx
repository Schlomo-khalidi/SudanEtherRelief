import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { relayEvent, signOutRelayer } from "@/app/relay/actions";
import { BrandMark } from "@/components/Brand";
import { CopyButton } from "@/components/CopyButton";
import { Card, Chip, SectionLabel, Stamp } from "@/components/ui";
import { getRelayerId } from "@/lib/relayer-auth";
import { buildKit } from "@/lib/kit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money, num, shortDate } from "@/lib/format";
import type { EventChainRow, EventRow, ShareLinkRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RelayDashboard({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; err?: string }>;
}) {
  const rid = await getRelayerId();
  if (!rid) redirect("/relay");
  const { code: kitCode, err } = await searchParams;

  const db = supabaseAdmin();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;

  const { data: relayer } = await db
    .from("relayers")
    .select("display_name, email, lane_members(relay_lanes(name))")
    .eq("id", rid)
    .maybeSingle();
  if (!relayer) redirect("/relay");
  const laneName =
    ((relayer.lane_members ?? []) as unknown as { relay_lanes: { name: string } }[])?.[0]?.relay_lanes?.name ?? "—";

  const [{ data: links }, { data: approved }] = await Promise.all([
    db.from("share_links").select("code, event_id, created_at, events(slug, headline, location_label)").eq("relayer_id", rid).order("created_at", { ascending: false }),
    db.from("events").select("*").eq("status", "approved").order("happened_at", { ascending: false }),
  ]);
  const myLinks = (links ?? []) as unknown as Array<ShareLinkRow & { events: { slug: string; headline: string; location_label: string | null } }>;
  const events = (approved ?? []) as EventRow[];

  const linkIds = myLinks.map((l) => l.id);
  let viewsByLink = new Map<string, number>();
  let clicksByLink = new Map<string, number>();
  let confirmedByLink = new Map<string, number>();
  if (linkIds.length) {
    const [v, c, a] = await Promise.all([
      db.from("link_views").select("share_link_id").in("share_link_id", linkIds),
      db.from("donation_clicks").select("share_link_id").in("share_link_id", linkIds),
      db.from("donation_attributions").select("share_link_id, amount").in("share_link_id", linkIds).eq("status", "confirmed"),
    ]);
    for (const r of v.data ?? []) viewsByLink.set((r as { share_link_id: string }).share_link_id, (viewsByLink.get((r as { share_link_id: string }).share_link_id) ?? 0) + 1);
    for (const r of c.data ?? []) clicksByLink.set((r as { share_link_id: string }).share_link_id, (clicksByLink.get((r as { share_link_id: string }).share_link_id) ?? 0) + 1);
    for (const r of (a.data ?? []) as { share_link_id: string; amount: number | null }[]) {
      confirmedByLink.set(r.share_link_id, (confirmedByLink.get(r.share_link_id) ?? 0) + Number(r.amount ?? 0));
    }
  }

  const totals = {
    views: [...viewsByLink.values()].reduce((a, b) => a + b, 0),
    clicks: [...clicksByLink.values()].reduce((a, b) => a + b, 0),
    confirmed: [...confirmedByLink.values()].reduce((a, b) => a + b, 0),
  };

  // selected kit
  const kitLink = kitCode ? myLinks.find((l) => l.code === kitCode.toUpperCase()) ?? null : null;
  const kitEvent = kitLink ? events.find((e) => e.id === kitLink.event_id) ?? null : null;
  const kitLinkUrl = kitLink ? `${base}/r/${kitLink.code}` : "";
  const kit = kitEvent
    ? {
        en: buildKit({ headline: kitEvent.headline, location: kitEvent.location_label ?? "Sudan", link: kitLinkUrl, lang: "en" }),
        ar: buildKit({ headline: kitEvent.headline, location: kitEvent.location_label ?? "السودان", link: kitLinkUrl, lang: "ar" }),
      }
    : null;
  const qr = kitLink ? await QRCode.toDataURL(kitLinkUrl, { width: 220, margin: 1, color: { dark: "#221c44", light: "#ffffff" } }) : null;
  const carriedIds = new Set(myLinks.map((l) => l.event_id));

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <BrandMark />
          <span className="mono" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", background: "var(--accent)", borderRadius: 6, padding: "4px 9px" }}>
            Relay hub
          </span>
          <nav className="topnav">
            <Link href="/" target="_blank">Public site ↗</Link>
          </nav>
          <div className="topbar-right">
            <span className="mono" style={{ fontSize: 10.5, color: "#9d96c9" }}>{(relayer.display_name ?? "").toUpperCase()} · {laneName}</span>
            <form action={signOutRelayer}>
              <button className="btn btn-ghost" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ paddingTop: 34, paddingBottom: 50 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.01em" }}>Your relay, {relayer.display_name?.split(" ")[0]}</h1>
          <div style={{ marginLeft: "auto" }} className="statline">
            <Chip tone="navy">{num(totals.views)} views</Chip>
            <Chip tone="navy">{num(totals.clicks)} clicks</Chip>
            <Chip tone="green">{money(totals.confirmed)} confirmed</Chip>
          </div>
        </div>

        {err === "nolane" ? <div className="chip chip-red" style={{ marginBottom: 14 }}>No lane on your profile — rejoin from the hub.</div> : null}

        <div className="kit-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* carry a story */}
            <Card pad>
              <SectionLabel>Carry a story — approved events</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {events.map((ev) => {
                  const carried = carriedIds.has(ev.id);
                  return (
                    <div key={ev.id} style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid #f0ead9", paddingBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="dateline" style={{ fontSize: 9.5 }}>{(ev.location_label ?? "SUDAN").toUpperCase()}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{ev.headline}</div>
                      </div>
                      {carried ? (
                        <Link className="btn btn-outline" href={`/relay/me?code=${myLinks.find((l) => l.event_id === ev.id)!.code}`}>My kit →</Link>
                      ) : (
                        <form action={relayEvent}>
                          <input type="hidden" name="eventId" value={ev.id} />
                          <button className="btn btn-accent" type="submit">Relay this →</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* kit */}
            {kitLink && kitEvent && kit ? (
              <Card pad>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  <Stamp>Witness verified</Stamp>
                  <b style={{ fontSize: 15 }}>{kitEvent.headline}</b>
                </div>

                <div className="kit-sec">Your tracked link</div>
                <div className="link-code">
                  <b className="mono" style={{ fontSize: 14 }}>{kitLinkUrl.replace(/^https?:\/\//, "")}</b>
                  <CopyButton text={kitLinkUrl} />
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR code" width={64} height={64} style={{ marginLeft: "auto", borderRadius: 6 }} />
                  ) : null}
                </div>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 16 }}>
                  Every open of this link lands on the event page and counts as <b>your</b> view. Print the QR for
                  tabling days — same attribution.
                </p>

                <div className="kit-sec">WhatsApp — ready to paste (EN)</div>
                <div className="copybox" style={{ marginBottom: 10 }}>
                  {kit.en.whatsapp}
                  <div style={{ marginTop: 8 }}><CopyButton text={kit.en.whatsapp} /></div>
                </div>
                <div className="kit-sec">WhatsApp — جاهز للنسخ (AR)</div>
                <div className="copybox" dir="rtl" style={{ marginBottom: 10 }}>
                  {kit.ar.whatsapp}
                  <div style={{ marginTop: 8 }}><CopyButton text={kit.ar.whatsapp} /></div>
                </div>
                <div className="kit-sec">Instagram caption (EN)</div>
                <div className="copybox" style={{ marginBottom: 10 }}>
                  {kit.en.instagram}
                  <div style={{ marginTop: 8 }}><CopyButton text={kit.en.instagram} /></div>
                </div>
                <div className="kit-sec">15-second video script</div>
                <div className="copybox" style={{ marginBottom: 14 }}>
                  {kit.en.script}
                  <div style={{ marginTop: 8 }}><CopyButton text={kit.en.script} /></div>
                </div>

                <div className="kit-sec">Cards (auto-generated, carry your attribution)</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <a href={`/event/${kitEvent.slug}/opengraph-image`} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="story-prev" src={`/event/${kitEvent.slug}/opengraph-image`} alt="Share card" style={{ width: 210 }} />
                  </a>
                  <a href={`/event/${kitEvent.slug}/story-image`} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="story-prev" src={`/event/${kitEvent.slug}/story-image`} alt="Story card" />
                  </a>
                  <p style={{ fontSize: 11.5, color: "var(--ink-3)", flex: 1, minWidth: 160 }}>
                    Left: feed/WhatsApp card 1200×630. Right: story card 1080×1920. Open in a new tab and
                    save — the QR and links inside point at your code.
                  </p>
                </div>

                <div style={{ marginTop: 14, background: "var(--green-soft)", border: "1px solid #c4e0d2", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "var(--ink-2)" }}>
                  <b style={{ color: "var(--green)" }}>Ground rules:</b> post the card as-is — every claim is sourced and
                  editor-approved. Use Ethar field imagery only. Say “confirmed” only for confirmed donations; your
                  dashboard already labels the difference.
                </div>
              </Card>
            ) : null}
          </div>

          {/* impact rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="give-card">
              <span className="k">Your impact — all time</span>
              <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
                <div><b className="serif" style={{ fontSize: 24 }}>{num(totals.views)}</b><div className="stat-lbl" style={{ color: "#9d96c9" }}>Views</div></div>
                <div><b className="serif" style={{ fontSize: 24 }}>{num(totals.clicks)}</b><div className="stat-lbl" style={{ color: "#9d96c9" }}>Clicks</div></div>
                <div><b className="serif" style={{ fontSize: 24, color: "#7fd3a8" }}>{money(totals.confirmed)}</b><div className="stat-lbl" style={{ color: "#9d96c9" }}>Confirmed</div></div>
              </div>
              <p style={{ color: "#b9b3dd", fontSize: 11.5, marginTop: 10 }}>
                Your chain, provable — views are opens of your links, clicks are Give taps, confirmed means a payment
                reference or reconciliation. Never estimated.
              </p>
            </div>

            <Card pad>
              <SectionLabel>Your links</SectionLabel>
              {myLinks.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No links yet — carry your first story on the left.</p>
              ) : (
                <div className="table-scroll">
                <table className="data mini-table">
                  <thead><tr><th>Code</th><th>Event</th><th>V/C</th><th>$</th></tr></thead>
                  <tbody>
                    {myLinks.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <Link href={`/relay/me?code=${l.code}`} className="mono" style={{ textDecoration: "none", color: "var(--accent-dark)" }}>
                            {l.code}
                          </Link>
                        </td>
                        <td>{l.events?.slug}</td>
                        <td className="mono">{viewsByLink.get(l.id) ?? 0}/{clicksByLink.get(l.id) ?? 0}</td>
                        <td className="mono" style={{ color: "var(--green)" }}>{money(confirmedByLink.get(l.id) ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Card>

            <Card pad style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Founding cohort</div>
              You&apos;re one of the first relayers carrying Sudan back into the feed. Every number your chain
              shows is one a judge — or an Ethar donor — can ask you to defend.
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
