import Link from "next/link";
import { TopBar, BroadcastIcon } from "@/components/Brand";
import { EventCard } from "@/components/EventCard";
import { getFeedData } from "@/lib/queries";
import { money, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { cards, global } = await getFeedData();

  return (
    <>
      <div className="ticker">
        <BroadcastIcon />
        <b>LIVE</b>
        <span>
          — {global.events} approved event{global.events === 1 ? "" : "s"} · every link attributed, every claim sourced
        </span>
      </div>

      <TopBar />

      <div className="livebar">
        <div className="wrap livebar-inner">
          <div className="live-item"><b>{String(global.events).padStart(2, "0")}</b><span>Approved events live</span></div>
          <div className="live-item"><b>{num(global.relayers)}</b><span>Relayers onboarded</span></div>
          <div className="live-item"><b>{num(global.views)}</b><span>Tracked views</span></div>
          <div className="live-item"><b>{num(global.clicks)}</b><span>Give clicks</span></div>
          <div className="live-item"><b><em>{money(global.confirmed)}</em></b><span>Confirmed donations</span></div>
          <div className="live-item"><b>{num(global.pending)}</b><span>Pending reconciliation</span></div>
        </div>
      </div>

      <main className="wrap">
        <div className="mission">
          <h1>
            Verified Sudan news, <em>human-approved</em>, handed to the communities that will carry it.
          </h1>
          <p>
            Every event below is drawn from cited sources and approved by an editor before you
            ever see it. Relay it, and your link shows exactly who saw it and what it raised.
          </p>
        </div>

        <div className="filters">
          <span className="filter on">All</span>
          <span className="filter">Sudan</span>
          <span className="filter">East Africa</span>
          <span className="filter">Famine &amp; food</span>
          <span className="filter">Health</span>
          <span className="filter">Displacement</span>
          <span className="count">Showing {cards.length} approved event{cards.length === 1 ? "" : "s"}</span>
        </div>

        <div className="feed">
          {cards.length === 0 ? (
            <div className="card card-pad" style={{ color: "var(--ink-2)" }}>
              No approved events yet — the newsroom is reviewing the first drafts.
            </div>
          ) : (
            cards.map((data) => <EventCard key={data.event.id} data={data} />)
          )}
        </div>

        <div className="band">
          <div className="band-inner">
            <h3>Don&apos;t just read it. Carry it.</h3>
            <p>
              Pick a lane — your mosque, campus, creators&apos; circle, diaspora group — and get a
              channel-ready kit with your own tracked link. You&apos;ll see exactly who your share reached.
            </p>
            <Link className="btn btn-accent btn-lg" href="/relay">Open the relay hub →</Link>
          </div>
        </div>

        <div className="foot">
          <span>Witness Relay — a visibility engine for Sudan &amp; East Africa. News in. Donations out.</span>
          <span className="sample-tag">◐ Prototype · seeded sample data</span>
        </div>
      </main>
    </>
  );
}
