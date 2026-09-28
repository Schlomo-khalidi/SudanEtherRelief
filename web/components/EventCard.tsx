import Link from "next/link";
import { money, num, shortDate, wireDate } from "@/lib/format";
import type { EventCardData } from "@/lib/queries";
import { Chip, Stamp } from "@/components/ui";

export function EventCard({ data }: { data: EventCardData }) {
  const { event, sources, pack, approval, chain } = data;
  const claims = pack?.claims ?? [];
  const summary =
    (claims.slice(0, 2).map((c) => c.text).join(" ") || event.explainer_what || "").slice(0, 240) +
    (claims.length > 2 || (event.explainer_what ?? "").length > 240 ? "…" : "");
  const hasConfirmed = Number(chain?.confirmed_amount ?? 0) > 0;

  return (
    <article className="card event-card">
      <div className="event-main">
        <div className="event-chips">
          <Stamp>Witness verified</Stamp>
          <Chip tone="navy">{sources.length} source{sources.length === 1 ? "" : "s"}</Chip>
          {approval ? (
            <Chip>Editor-approved · {approval.actor} · {shortDate(approval.at)}</Chip>
          ) : null}
          {event.is_demo ? <Chip tone="amber">Sample data</Chip> : null}
        </div>
        <div className="dateline" style={{ margin: "10px 0 6px" }}>
          {(event.location_label ?? "Sudan").toUpperCase()} — {wireDate(event.happened_at)}
        </div>
        <h2 className="serif">
          <Link href={`/event/${event.slug}`}>{event.headline}</Link>
        </h2>
        <p className="event-sum">{summary}</p>
        <div className="event-foot">
          <div className="mstat"><b>{num(chain?.views ?? 0)}</b><span>Views</span></div>
          <div className="mstat"><b>{num(chain?.clicks ?? 0)}</b><span>Clicks</span></div>
          <div className="mstat ok">
            <b>{hasConfirmed ? money(chain?.confirmed_amount) : "$—"}</b>
            <span>{hasConfirmed ? `Confirmed · ${chain?.confirmed_count} gifts` : "Relay open"}</span>
          </div>
          <Link className="btn btn-accent" href="/relay">Relay this →</Link>
        </div>
      </div>
      <aside className="event-side">
        <span className="side-label">Sources behind this card</span>
        {sources.slice(0, 3).map((s, i) => (
          <div className="src-row" key={s.id}>
            <span className="src-n">S{i + 1}</span>
            <div>
              <b>{s.outlet}{s.is_field_report ? " · field" : ""}</b>
              <span>{shortDate(s.published_at)}</span>
            </div>
          </div>
        ))}
        {sources.length > 3 ? (
          <span className="side-label" style={{ marginTop: 4 }}>
            + {sources.length - 3} more on the event page
          </span>
        ) : null}
      </aside>
    </article>
  );
}
