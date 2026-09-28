/**
 * Witness Relay — seed script (Layer 1)
 * Loads sample editorial data flagged is_demo=true so the product is
 * clickable before the first real ingest run.
 *
 * Run:  npx tsx scripts/seed.ts     (requires .env.local filled in)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const LANES = [
  { name: "Mosque — Al-Noor Friday circle", type: "mosque", region: "Minneapolis, US", language: "en" },
  { name: "Campus — City Univ MSA", type: "campus", region: "Chicago, US", language: "en" },
  { name: "Creators — Sudan cohort", type: "creator", region: "London, UK", language: "en" },
  { name: "Diaspora — Minneapolis", type: "diaspora", region: "Minneapolis, US", language: "ar" },
];

const RELAYERS = [
  { display_name: "Amina K.", email: "amina@example.org", optin_leaderboard: true, lane: 0 },
  { display_name: "Yusuf A.", email: "yusuf@example.org", optin_leaderboard: true, lane: 0 },
  { display_name: "Sara M.", email: "sara@example.org", optin_leaderboard: true, lane: 1 },
  { display_name: "Layla H.", email: "layla@example.org", optin_leaderboard: false, lane: 2 },
  { display_name: "Omar D.", email: "omar@example.org", optin_leaderboard: true, lane: 3 },
];

const EVENTS = [
  {
    slug: "zamzam-famine-confirmed",
    headline: "Famine confirmed in Zamzam displacement camp as access remains blocked",
    location_label: "Zamzam Camp, North Darfur",
    status: "approved" as const,
    explainer_what:
      "The Integrated Food Security Phase Classification formally confirmed famine in Zamzam camp — the first such determination in Sudan since 2017. Aid convoys have been unable to reach the camp since April; the most recent attempt was turned back on 21 September. Field teams report more than 300 children admitted for severe malnutrition this week.",
    explainer_why:
      "Zamzam hosts roughly half a million displaced people. When a story drops out of the news cycle, the corridor funding that keeps supply lines open follows within weeks. Coverage is not sympathy — it is logistics.",
    donation_ask:
      "$40 — one emergency food parcel for a family of six for two weeks. $240 — a corridor carton run: 6 parcels plus water treatment tablets. Ethar Relief teams are staging from the nearest reachable corridor and rotating stock daily.",
    ethar_copy_locked: true,
    sources: [
      { outlet: "IPC / UN OCHA", title: "Famine (IPC Phase 5) confirmed in Zamzam camp, North Darfur", url: "https://example.org/ipc/zamzam", quote: "Famine (IPC Phase 5) confirmed in Zamzam camp, North Darfur…", published_at: "2026-09-24T09:05:00Z" },
      { outlet: "Radio Dabanga", title: "Convoys denied access for a fifth consecutive month", url: "https://example.org/dabanga/convoys", quote: "Convoys denied access for a fifth consecutive month…", published_at: "2026-09-23T18:40:00Z" },
      { outlet: "Sudan Tribune", title: "Aid groups warn corridor closures now measurable in admissions", url: "https://example.org/tribune/corridor", quote: "Aid groups warn corridor closures now measurable in admissions…", published_at: "2026-09-24T11:12:00Z" },
    ],
  },
  {
    slug: "el-fasher-hospital-overflow",
    headline: "El Fasher's last functioning hospital overflows as siege enters new phase",
    location_label: "El Fasher, North Darfur",
    status: "approved" as const,
    explainer_what:
      "Local doctors report pediatric wards at three times capacity and two weeks of essential supplies remaining. Water trucking has stopped in three quartiers. Ethar Relief is supporting a mobile clinic route on the western approach.",
    explainer_why:
      "Hospitals under siege depend on corridor negotiations that follow attention. Silence at the negotiating table is priced in lives.",
    donation_ask:
      "$60 — a mobile-clinic patient day: triage, oral rehydration and antibiotics. Approved by Ethar Relief programs team.",
    ethar_copy_locked: true,
    sources: [
      { outlet: "Sudan Doctors Union", title: "Pediatric wards at three times capacity", url: "https://example.org/sdu/elfasher", quote: "Pediatric wards at three times capacity…", published_at: "2026-09-25T21:30:00Z" },
      { outlet: "Radio Dabanga", title: "Water trucking halts in three El Fasher quartiers", url: "https://example.org/dabanga/water", quote: "Water trucking halts in three El Fasher quartiers…", published_at: "2026-09-26T06:10:00Z" },
      { outlet: "UN OCHA", title: "Flash update: El Fasher", url: "https://example.org/ocha/elfasher", quote: "Flash update: El Fasher…", published_at: "2026-09-26T07:52:00Z" },
    ],
  },
  {
    slug: "khartoum-cholera-spread",
    headline: "Cholera treatment points overwhelmed as outbreak spreads through Khartoum state",
    location_label: "Khartoum State",
    status: "in_review" as const,
    explainer_what:
      "Health ministry figures show new cases doubling week over week in three localities. Ethar field staff report oral rehydration stocks at three of five supported points running below a five-day supply.",
    explainer_why: "Cholera moves at the speed of attention: rehydration points funded this week are beds saved next week.",
    donation_ask: "$25 — a full oral rehydration course for one patient. Approved by Ethar Relief programs team.",
    ethar_copy_locked: true,
    sources: [
      { outlet: "Sudan Tribune", title: "Cholera cases double week over week in three localities", url: "https://example.org/tribune/cholera", quote: "Cholera cases double week over week…", published_at: "2026-09-27T12:20:00Z" },
      { outlet: "Ethar field memo", title: "ORS stocks below five-day supply at three of five points", url: "https://example.org/ethar/memo", quote: "ORS stocks below five-day supply…", published_at: "2026-09-27T14:50:00Z", is_field_report: true },
    ],
  },
];

async function main() {
  // idempotent: clear previous sample rows before re-seeding
  await db.from("events").delete().eq("is_demo", true);
  await db.from("relayers").delete().in("email", RELAYERS.map((r) => r.email));
  await db.from("relay_lanes").delete().in("name", LANES.map((l) => l.name));

  // lanes
  const laneIds: string[] = [];
  for (const lane of LANES) {
    const { data, error } = await db.from("relay_lanes").insert(lane).select("id").single();
    if (error) throw error;
    laneIds.push(data!.id);
  }
  console.log(`lanes: ${laneIds.length}`);

  // relayers + memberships
  const relayerIds: string[] = [];
  for (const r of RELAYERS) {
    const { lane, ...row } = r;
    const { data, error } = await db.from("relayers").insert(row).select("id").single();
    if (error) throw error;
    relayerIds.push(data!.id);
    const { error: mErr } = await db
      .from("lane_members")
      .insert({ relayer_id: data!.id, lane_id: laneIds[lane] });
    if (mErr) throw mErr;
  }
  console.log(`relayers: ${relayerIds.length}`);

  // events → sources → story pack → decision
  for (const ev of EVENTS) {
    const { sources: _evSources, explainer_what, explainer_why, donation_ask, ...eventRow } = ev;
    const { data: e, error } = await db
      .from("events")
      .insert({ ...eventRow, explainer_what, explainer_why, donation_ask, is_demo: true, happened_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    const eventId = e!.id;

    const { data: srcs, error: sErr } = await db
      .from("sources")
      .insert(
        ev.sources.map((s) => ({
          ...s,
          event_id: eventId,
          is_field_report: (s as { is_field_report?: boolean }).is_field_report ?? false,
        })),
      )
      .select("id, outlet");
    if (sErr) throw sErr;

    const claims = ev.sources.map((s, i) => ({ text: s.quote!.replace("…", "."), sourceIds: [srcs![i].id] }));
    const { data: pack, error: pErr } = await db
      .from("story_packs")
      .insert({ event_id: eventId, headline: ev.headline, claims, ai_confidence: 0.9, status: "current" })
      .select("id")
      .single();
    if (pErr) throw pErr;

    await db.from("editorial_decisions").insert({
      event_id: eventId,
      story_pack_id: pack!.id,
      actor: ev.status === "approved" ? "A. Osman" : "system",
      action: ev.status === "approved" ? "approve" : "auto_draft",
      note: ev.status === "approved" ? "Seed: sample approval" : "Seed: sample AI draft",
    });

    // a few share links so the chain board has structure
    if (ev.status === "approved") {
      for (let i = 0; i < 3; i++) {
        await db.from("share_links").insert({
          code: `${ev.slug.slice(0, 2).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          event_id: eventId,
          lane_id: laneIds[i],
          relayer_id: relayerIds[i],
          channel: "whatsapp",
        });
      }
    }
    console.log(`event: ${ev.slug} (${ev.status}, ${srcs!.length} sources)`);
  }

  console.log("seed complete — all rows flagged is_demo=true");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
