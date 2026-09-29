import Link from "next/link";
import { TopBar, BroadcastIcon } from "@/components/Brand";
import { EventCard } from "@/components/EventCard";
import { getFeedData } from "@/lib/queries";
import { TOPIC_CHIPS, isTopicSlug, topicsFor } from "@/lib/topics";
import { money, num } from "@/lib/format";
import type { EventCardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic: rawTopic } = await searchParams;
  const topic = isTopicSlug(rawTopic) ? rawTopic : null;
  const { cards, global } = await getFeedData();

  const withTags = cards.map((card) => ({
    ...card,
    tags: topicsFor(
      card.event,
      `${(card.pack?.claims ?? []).map((c) => c.text).join(" ")} ${card.event.explainer_what ?? ""}`,
    ),
  }));
  const visible = topic ? withTags.filter((c) => c.tags.includes(topic)) : withTags;

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
          <Link href="/" className={`filter${topic === null ? " on" : ""}`}>All</Link>
          {TOPIC_CHIPS.map((chip) => (
            <Link
              key={chip.slug}
              href={topic === chip.slug ? "/" : `/?topic=${chip.slug}`}
              className={`filter${topic === chip.slug ? " on" : ""}`}
            >
              {chip.label}
            </Link>
          ))}
          <span className="count">
            Showing {visible.length} of {cards.length} approved event{cards.length === 1 ? "" : "s"}
            {topic ? ` · ${TOPIC_CHIPS.find((c) => c.slug === topic)!.label}` : ""}
          </span>
        </div>

        <div className="feed">
          {visible.length === 0 ? (
            <div className="card card-pad" style={{ color: "var(--ink-2)" }}>
              Nothing under this topic yet — new stories land as the wires report them.
            </div>
          ) : (
            visible.map((data) => <EventCard key={data.event.id} data={data} />)
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
