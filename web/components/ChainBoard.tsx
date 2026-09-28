import { money, num } from "@/lib/format";
import type { EventChainRow, LaneChainRow } from "@/lib/types";

export function ChainBoard({ chain, lanes }: { chain: EventChainRow | null; lanes: LaneChainRow[] }) {
  const views = Number(chain?.views ?? 0);
  const clicks = Number(chain?.clicks ?? 0);
  const confirmed = Number(chain?.confirmed_amount ?? 0);
  const confirmedCount = Number(chain?.confirmed_count ?? 0);
  const pending = Number(chain?.pending_count ?? 0);
  const maxViews = Math.max(1, ...lanes.map((l) => Number(l.views ?? 0)));

  return (
    <section className="chain">
      <div className="section-label">The chain so far — this event, end to end</div>
      <div className="chain-flow">
        <div className="cf-node"><b>1</b><span>Verified event</span></div>
        <div className="cf-arrow">→</div>
        <div className="cf-node"><b>{num(chain?.lanes_count ?? 0)}</b><span>Relay lanes</span></div>
        <div className="cf-arrow">→</div>
        <div className="cf-node"><b>{num(chain?.relayers_count ?? 0)}</b><span>Relayers</span></div>
        <div className="cf-arrow">→</div>
        <div className="cf-node"><b>{num(views)}</b><span>Views</span></div>
        <div className="cf-arrow">→</div>
        <div className="cf-node"><b>{num(clicks)}</b><span>Clicks</span></div>
        <div className="cf-arrow">→</div>
        <div className="cf-node hot"><b>{money(confirmed)}</b><span>Confirmed · {confirmedCount} gifts</span></div>
      </div>

      <div className="card lane-table">
        <table className="data">
          <thead>
            <tr>
              <th>Lane</th>
              <th>Relayers</th>
              <th>Views</th>
              <th>Clicks</th>
              <th>Confirmed donations</th>
              <th style={{ width: 130 }}>Share of views</th>
            </tr>
          </thead>
          <tbody>
            {lanes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--ink-3)" }}>
                  No relay lanes carrying this event yet — be the first via the relay hub.
                </td>
              </tr>
            ) : (
              lanes.map((l) => (
                <tr key={l.lane_id}>
                  <td><b>{l.lane_name}</b></td>
                  <td>{l.relayers_count}</td>
                  <td>{num(l.views)}</td>
                  <td>{num(l.clicks)}</td>
                  <td>
                    <b className="mono" style={{ color: "var(--green)" }}>{money(l.confirmed_amount)}</b>
                  </td>
                  <td>
                    <div className="bar">
                      <i style={{ width: `${Math.round((Number(l.views ?? 0) / maxViews) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="chain-foot">
          <span>
            Donations marked <b>confirmed</b> come from payment references or approved reconciliation — never estimates.
          </span>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{pending} gifts pending reconciliation</span>
        </div>
      </div>
    </section>
  );
}
