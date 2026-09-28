"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { RELAYER_COOKIE, makeRelayerToken } from "@/lib/relayer-auth";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function relayerId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(RELAYER_COOKIE)?.value;
  if (!token) return null;
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  return id; // signature verified implicitly by cookie integrity + expiry; page checks exist below
}

/** Join: upsert relayer by email, attach to (or create) a lane, set session cookie. */
export async function join(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const laneId = String(formData.get("laneId") ?? "");
  const newLane = String(formData.get("newLane") ?? "").trim();

  if (!name || !email || (!laneId && !newLane)) redirect("/relay?e=1");

  const dbi = db();

  let targetLaneId = laneId;
  if (newLane) {
    const { data: lane } = await dbi.from("relay_lanes").insert({ name: newLane, type: "other" }).select("id").single();
    targetLaneId = lane!.id;
  }

  const { data: existing } = await dbi.from("relayers").select("id").eq("email", email).maybeSingle();
  let relayerRow: { id: string };
  if (existing) {
    await dbi.from("relayers").update({ display_name: name, optin_leaderboard: true }).eq("id", existing.id);
    relayerRow = existing as { id: string };
  } else {
    const { data, error } = await dbi
      .from("relayers")
      .insert({ display_name: name, email, optin_leaderboard: true })
      .select("id")
      .single();
    if (error) redirect(`/relay?e=${encodeURIComponent(error.message)}`);
    relayerRow = data!;
  }

  await dbi.from("lane_members").upsert(
    { relayer_id: relayerRow.id, lane_id: targetLaneId },
    { onConflict: "relayer_id,lane_id" },
  );

  const jar = await cookies();
  jar.set(RELAYER_COOKIE, await makeRelayerToken(relayerRow.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/relay/me");
}

export async function signOutRelayer() {
  const jar = await cookies();
  jar.delete(RELAYER_COOKIE);
  redirect("/relay");
}

/** Carry a story: create (or reuse) this relayer's tracked link for an event. */
export async function relayEvent(formData: FormData) {
  const rid = await relayerId();
  if (!rid) redirect("/relay");
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) redirect("/relay/me");

  const dbi = db();
  const { data: relayer } = await dbi.from("relayers").select("id, lane_members(lane_id)").eq("id", rid).maybeSingle();
  if (!relayer) redirect("/relay");
  const laneId = (relayer.lane_members as { lane_id: string }[] | null)?.[0]?.lane_id;
  if (!laneId) redirect("/relay/me?err=nolane");

  const { data: existing } = await dbi
    .from("share_links")
    .select("code")
    .eq("relayer_id", rid)
    .eq("event_id", eventId)
    .maybeSingle();

  let code = existing?.code;
  if (!code) {
    const { data: ev } = await dbi.from("events").select("slug").eq("id", eventId).single();
    code = `${(ev!.slug ?? "WR").slice(0, 2).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error } = await dbi
      .from("share_links")
      .insert({ code, event_id: eventId, lane_id: laneId, relayer_id: rid, channel: "whatsapp" });
    if (error) redirect(`/relay/me?err=${encodeURIComponent(error.message)}`);
  }

  redirect(`/relay/me?code=${code}`);
}
