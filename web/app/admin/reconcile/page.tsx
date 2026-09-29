import { reconcile } from "@/app/admin/actions";
import { AdminShell } from "@/app/admin/AdminShell";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReconcilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; skip?: string; msg?: string }>;
}) {
  const { ok, skip, msg } = await searchParams;
  const db = supabaseAdmin();

  const { data: attributions } = await db
    .from("donation_attributions")
    .select("id, amount, currency, method, status, external_ref, confirmed_at, events(slug)")
    .order("confirmed_at", { ascending: false })
    .limit(12);
  const { count: pendingCount } = await db
    .from("donation_attributions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const rows = (attributions ?? []) as unknown as Array<{
    id: string;
    amount: number | null;
    currency: string;
    method: string;
    status: string;
    external_ref: string | null;
    confirmed_at: string | null;
    events: { slug: string } | { slug: string }[] | null;
  }>;

  return (
    <AdminShell active="reconcile">
      <main className="wrap" style={{ padding: "24px 0 40px", maxWidth: 980 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: "10px 0 6px" }}>
          Reconciliation — turning payment records into confirmed donations
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20, maxWidth: 700 }}>
          Paste the donation export from LaunchGood (or any processor). One donation per line:
          <span className="mono" style={{ fontSize: 12.5, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", margin: "0 4px" }}>
            ref, amount, date?, currency?
          </span>
          — the ref is the relay code the donor came through. Manual gifts without a link use
          <span className="mono" style={{ fontSize: 12.5, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", margin: "0 4px" }}>
            DIRECT:event-slug, amount
          </span>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
          <form action={reconcile}>
            <textarea
              name="csv"
              rows={9}
              placeholder={"ZA2GLP, 25.00, 2026-09-28\nZAQ7KT, 100.00\nDIRECT:zamzam-famine-confirmed, 40.00"}
              style={{
                width: "100%",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "14px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.8,
                background: "#fff",
              }}
            />
            <button className="btn btn-green btn-lg" type="submit" style={{ marginTop: 12 }}>
              Import &amp; mark confirmed →
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card card-pad" style={{ padding: 18 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Result</div>
              {ok !== undefined ? (
                <div style={{ fontSize: 13.5 }}>
                  <div><span className="chip chip-green">✓ {ok} confirmed</span></div>
                  {Number(skip ?? 0) > 0 || msg ? (
                    <div style={{ marginTop: 8 }}>
                      <span className="chip chip-amber">{skip ?? 0} skipped</span>
                      {msg ? (
                        <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8, wordBreak: "break-word" }}>
                          {decodeURIComponent(msg)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                  Imports appear in the chain immediately — labeled <b>confirmed · csv_reconcile</b>, never blended with tracked clicks.
                </p>
              )}
            </div>
            <div className="card card-pad" style={{ padding: 18 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Awaiting reconciliation</div>
              <b className="serif" style={{ fontSize: 26, color: "var(--amber)" }}>{pendingCount ?? 0}</b>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: 8 }}>pending attributions</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Ref</th><th>Event</th><th>Amount</th><th>Method</th><th>Status</th><th>Confirmed at</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ color: "var(--ink-3)" }}>No attributions yet — imports will appear here.</td></tr>
              ) : (
                rows.map((r) => {
                  const ev = Array.isArray(r.events) ? r.events[0] : r.events;
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.external_ref ?? "—"}</td>
                      <td>{ev?.slug ?? "—"}</td>
                      <td><b>{money(r.amount)}</b> {r.currency}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{r.method}</td>
                      <td><span className={r.status === "confirmed" ? "chip chip-green" : "chip chip-amber"}>{r.status}</span></td>
                      <td className="mono" style={{ fontSize: 11 }}>{r.confirmed_at ? r.confirmed_at.slice(0, 10) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
