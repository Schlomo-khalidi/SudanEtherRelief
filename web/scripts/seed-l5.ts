/**
 * Layer 5 seed — the founding relayer cohort + field imagery assets.
 * Run:  npx tsx scripts/seed-l5.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const RELAYERS = [
  { display_name: "Joshua Nyangena", email: "joshua.nyangena@relayers.local", lane: "Campus — City Univ MSA" },
  { display_name: "Allan Munene", email: "allan.munene@relayers.local", lane: "Mosque — Al-Noor Friday circle" },
  { display_name: "Gasser Bagoga", email: "gasser.bagoga@relayers.local", lane: "Diaspora — Minneapolis" },
  { display_name: "Newton Mureri", email: "newton.mureri@relayers.local", lane: "Creators — Sudan cohort" },
  { display_name: "Linda Njeri", email: "linda.njeri@relayers.local", lane: "Campus — City Univ MSA" },
];

const IMAGERY = [
  { slug: "zamzam-famine-confirmed", path: "/field/children-ethar.jpg", caption: "Children supported by Ethar Relief", credit: "Ethar Relief" },
  { slug: "el-fasher-hospital-overflow", path: "/field/team-djibouti.jpg", caption: "Ethar Relief team arriving in Djibouti", credit: "Ethar Relief" },
  { slug: "khartoum-cholera-spread", path: "/field/water-site.jpg", caption: "Children at a water project site", credit: "Ethar Relief" },
];

async function main() {
  // relayers (upsert by email so re-runs are safe)
  for (const r of RELAYERS) {
    const { data: lane } = await db.from("relay_lanes").select("id").eq("name", r.lane).maybeSingle();
    if (!lane) throw new Error(`lane not found: ${r.lane}`);
    const { data: existing } = await db.from("relayers").select("id").eq("email", r.email).maybeSingle();
    let relayerId: string;
    if (existing) {
      relayerId = existing.id;
      await db.from("relayers").update({ display_name: r.display_name, optin_leaderboard: true }).eq("id", relayerId);
    } else {
      const { data, error } = await db
        .from("relayers")
        .insert({ display_name: r.display_name, email: r.email, optin_leaderboard: true })
        .select("id")
        .single();
      if (error) throw error;
      relayerId = data!.id;
    }
    await db.from("lane_members").upsert(
      { relayer_id: relayerId, lane_id: lane.id },
      { onConflict: "relayer_id,lane_id" },
    );
    console.log(`relayer: ${r.display_name} → ${r.lane}`);
  }

  // field imagery as 'feed' assets (public pages render kind=feed as the event photo)
  for (const im of IMAGERY) {
    const { data: ev } = await db.from("events").select("id").eq("slug", im.slug).maybeSingle();
    if (!ev) throw new Error(`event not found: ${im.slug}`);
    await db.from("assets").delete().eq("event_id", ev.id).eq("kind", "feed");
    const { error } = await db.from("assets").insert({
      event_id: ev.id,
      kind: "feed",
      language: "en",
      storage_path: im.path,
      meta: { caption: im.caption, credit: im.credit },
    });
    if (error) throw error;
    console.log(`imagery: ${im.slug} → ${im.path}`);
  }

  console.log("layer 5 seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
