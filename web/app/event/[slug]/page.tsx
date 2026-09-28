import { notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/Brand";
import { ChainBoard } from "@/components/ChainBoard";
import { getEventDetail } from "@/lib/queries";
import { money, shortDate, wireDate } from "@/lib/format";
import type { Claim, SourceRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { slug } = await params;
  const { via } = await searchParams;
  const detail = await getEventDetail(slug);
  if (!detail) notFound();

  const { event, sources, pack, approval, chain, lanes } = detail;
  const claims: Claim[] = pack?.claims ?? [];

  // claim pills reference S-numbers by position in the sorted source list
  const sourceIndex = new Map<string, number>();
  sources.forEach((s: SourceRow, i) => sourceIndex.set(s.id, i + 1));

  const donationBase = process.env.DONATION_BASE_URL;
  const giveHref = via && donationBase
    ? `/api/track/click?code=${encodeURIComponent(via)}`
    : donationBase
      ? donationBase
      : "#give";

  return (
    <>
      <TopBar />
      <main className="wrap">
        <div className="crumbs">
          <Link href="/">Live feed</Link><span className="sep">/</span>
          <span>Sudan &amp; East Africa</span>
          {event.location_label ? (<><span className="sep">/</span><span>{event.location_label}</span></>) : null}
        </div>

        <div className="head">
          <div className="chips">
            <span className="stamp">Witness verified</span>
            <span className="chip chip-navy">{sources.length} sources</span>
            {event.is_demo ? <span className="chip chip-amber">Sample data</span> : null}
          </div>
          <div className="dateline">
            {(event.location_label ?? "SUDAN").toUpperCase()} — {wireDate(event.happened_at)}
          </div>
          <h1 className="serif">{event.headline}</h1>
          <div className="approval">
            {approval ? (
              <>Approved for publication by <b>{approval.actor}</b> (editor) · {wireDate(approval.at)} · human decision logged</>
            ) : (
              <>Human approval record pending</>
            )}
          </div>
        </div>

        <div className="layout">
          <div className="prose">
            <section>
              <h3>What happened</h3>
              {claims.map((c, i) => (
                <div className="claim" key={i}>
                  <p>
                    {c.text}
                    {(c.sourceIds ?? []).map((sid) => {
                      const n = sourceIndex.get(sid);
                      return n ? (
                        <a className="src-pill" key={sid} href={`#source-${n}`}>
                          S{n} · {sources[n - 1]?.outlet}
                        </a>
                      ) : null;
                    })}
                  </p>
                </div>
              ))}
              {claims.length === 0 ? <p>{event.explainer_what}</p> : null}
            </section>

            <section>
              <h3>Why it matters now</h3>
              <p>{event.explainer_why}</p>
            </section>

            <section style={{ borderBottom: 0 }}>
              <h3>What a donation supports — Ethar-approved{event.ethar_copy_locked ? " & locked" : ""}</h3>
              <div className="donate-ask" id="give">
                <span className="k">Specifically, this week</span>
                <p>{event.donation_ask}</p>
                <div className="ethar-note">
                  <span className="ethar-mark">ER</span>
                  <span>
                    Copy and figures approved by Ethar Relief programs team. No AI-invented
                    imagery: photos are Ethar field assets, credited.
                  </span>
                </div>
              </div>
            </section>
          </div>

          <aside className="rail">
            <div className="give-card">
              <span className="k">Act on this story</span>
              <h4 className="serif">Turn attention into relief</h4>
              <p className="sub">
                You give through Ethar Relief&apos;s campaign; your relay link attributes the gift to this event&apos;s chain.
              </p>
              <ul>
                <li><span className="tick">✓</span><span><b>100%</b> reaches Ethar Relief field work</span></li>
                <li><span className="tick">✓</span><span>Gift attributed to <b>this event&apos;s chain</b>{via ? ` via your link` : ""}</span></li>
                <li><span className="tick">✓</span><span>Confirmed only on payment reference — never estimated</span></li>
              </ul>
              <a
                className="btn btn-accent btn-lg"
                style={{ width: "100%", justifyContent: "center" }}
                href={giveHref}
                aria-disabled={!donationBase}
              >
                Give now →
              </a>
              <div className="via">
                {via
                  ? `attributed to share link /r/${via.toUpperCase()}`
                  : donationBase
                    ? "direct — relay a link to attribute your gift"
                    : "donation campaign wiring pending (Layer 6)"}
              </div>
            </div>

            <div className="card sources-card">
              <div className="section-label" style={{ marginBottom: 6 }}>Sources ({sources.length})</div>
              {sources.map((s, i) => (
                <div className="src" id={`source-${i + 1}`} key={s.id}>
                  <b>
                    {s.outlet}{s.is_field_report ? " · field report" : ""}
                    <span>{shortDate(s.published_at)}</span>
                  </b>
                  <q>{s.quote ?? s.title}</q>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--accent-dark)" }}>
                    open source ↗
                  </a>
                </div>
              ))}
            </div>

            <div className="card share-card">
              <div className="section-label" style={{ marginBottom: 6 }}>Share / relay</div>
              <div className="row">
                <Link className="share-btn hot" href="/relay">Relay hub →</Link>
                <Link className="share-btn" href="/how-it-works">How it works</Link>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10 }}>
                Relayers get channel-ready kits (WhatsApp, Instagram, short video) with a personal
                tracked link — that is where attribution happens.
              </p>
            </div>
          </aside>
        </div>

        <ChainBoard chain={chain} lanes={lanes} />

        <div className="foot" style={{ paddingTop: 0 }}>
          <span>Witness Relay — news in. Donations out.</span>
          <span className="sample-tag">◐ Prototype{event.is_demo ? " · seeded sample data" : ""} · live totals {money(chain?.confirmed_amount)} confirmed</span>
        </div>
      </main>
    </>
  );
}
