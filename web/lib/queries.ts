import { supabaseAdmin, supabasePublic } from "@/lib/supabase/server";
import { libraryImagery } from "@/lib/imagery";
import type {
  DecisionRow,
  EventChainRow,
  EventRow,
  LaneChainRow,
  SourceRow,
  StoryPackRow,
} from "@/lib/types";

/**
 * Server-side reads for the public site.
 * Public-facing rows go through the anon client (RLS-scoped to approved
 * events); editorial_decisions has no anon policy, so that one read uses
 * the service-role client on the server only.
 */

export type EventCardData = {
  event: EventRow;
  sources: SourceRow[];
  pack: StoryPackRow | null;
  approval: { actor: string; at: string } | null;
  chain: EventChainRow | null;
};

export type FeedData = {
  cards: EventCardData[];
  global: {
    events: number;
    relayers: number;
    views: number;
    clicks: number;
    confirmed: number;
    pending: number;
  };
};

export async function getFeedData(): Promise<FeedData> {
  const anon = supabasePublic();

  const { data: events, error } = await anon
    .from("events")
    .select("*")
    .eq("status", "approved")
    .order("happened_at", { ascending: false });
  if (error) throw new Error(`events: ${error.message}`);
  const list = (events ?? []) as EventRow[];
  const ids = list.map((e) => e.id);

  if (ids.length === 0) return { cards: [], global: { events: 0, relayers: 0, views: 0, clicks: 0, confirmed: 0, pending: 0 } };

  const [sourcesRes, packsRes, chainRes, relayersRes, decisionsRes] = await Promise.all([
    anon.from("sources").select("*").in("event_id", ids).order("published_at", { ascending: false }),
    anon.from("story_packs").select("*").in("event_id", ids).eq("status", "current"),
    anon.from("event_chain").select("*").in("event_id", ids),
    anon.from("relayers").select("id", { count: "exact", head: true }),
    supabaseAdmin()
      .from("editorial_decisions")
      .select("*")
      .in("event_id", ids)
      .eq("action", "approve")
      .order("created_at", { ascending: false }),
  ]);

  const sources = (sourcesRes.data ?? []) as SourceRow[];
  const packs = (packsRes.data ?? []) as StoryPackRow[];
  const chains = (chainRes.data ?? []) as EventChainRow[];
  const decisions = (decisionsRes.data ?? []) as DecisionRow[];

  const cards: EventCardData[] = list.map((event) => ({
    event,
    sources: sources.filter((s) => s.event_id === event.id),
    pack: packs.find((p) => p.event_id === event.id) ?? null,
    approval: (() => {
      const d = decisions.find((x) => x.event_id === event.id);
      return d ? { actor: d.actor, at: d.created_at } : null;
    })(),
    chain: chains.find((c) => c.event_id === event.id) ?? null,
  }));

  return {
    cards,
    global: {
      events: list.length,
      relayers: relayersRes.count ?? 0,
      views: chains.reduce((a, c) => a + Number(c.views ?? 0), 0),
      clicks: chains.reduce((a, c) => a + Number(c.clicks ?? 0), 0),
      confirmed: chains.reduce((a, c) => a + Number(c.confirmed_amount ?? 0), 0),
      pending: chains.reduce((a, c) => a + Number(c.pending_count ?? 0), 0),
    },
  };
}

export type EventDetail = {
  event: EventRow;
  sources: SourceRow[];
  pack: StoryPackRow | null;
  approval: { actor: string; at: string } | null;
  chain: EventChainRow | null;
  lanes: LaneChainRow[];
  /** field asset when attached; otherwise a topic-matched library image */
  photo: { path: string; caption: string; credit: string; library: boolean } | null;
};

export async function getEventDetail(slug: string): Promise<EventDetail | null> {
  const anon = supabasePublic();

  const { data: event } = await anon
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!event) return null;
  const e = event as EventRow;

  const [sourcesRes, packsRes, chainRes, lanesRes, decisionsRes, photoRes] = await Promise.all([
    anon.from("sources").select("*").eq("event_id", e.id).order("published_at", { ascending: false }),
    anon.from("story_packs").select("*").eq("event_id", e.id).eq("status", "current").maybeSingle(),
    anon.from("event_chain").select("*").eq("event_id", e.id).maybeSingle(),
    anon.from("event_lane_chain").select("*").eq("event_id", e.id).order("views", { ascending: false }),
    supabaseAdmin()
      .from("editorial_decisions")
      .select("*")
      .eq("event_id", e.id)
      .eq("action", "approve")
      .order("created_at", { ascending: false })
      .limit(1),
    anon.from("assets").select("storage_path, meta").eq("event_id", e.id).eq("kind", "feed").maybeSingle(),
  ]);

  const photoRow = (photoRes.data ?? null) as { storage_path: string; meta: { caption?: string; credit?: string } } | null;
  const photo = photoRow
    ? { path: photoRow.storage_path, caption: photoRow.meta?.caption ?? "Ethar Relief field photo", credit: photoRow.meta?.credit ?? "Ethar Relief", library: false }
    : libraryImagery(e, `${e.headline} ${e.explainer_what ?? ""}`);

  return {
    event: e,
    sources: (sourcesRes.data ?? []) as SourceRow[],
    pack: (packsRes.data ?? null) as StoryPackRow | null,
    approval: (() => {
      const d = (decisionsRes.data ?? [])[0] as DecisionRow | undefined;
      return d ? { actor: d.actor, at: d.created_at } : null;
    })(),
    chain: (chainRes.data ?? null) as EventChainRow | null,
    lanes: (lanesRes.data ?? []) as LaneChainRow[],
    photo,
  };
}

/** tracked /r/[code] redirect target; anon read is RLS-safe (share links are public rows) */
export async function getShareLink(code: string): Promise<{ id: string; event_id: string; slug: string } | null> {
  const { data } = await supabasePublic()
    .from("share_links")
    .select("id, event_id, events(slug)")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; event_id: string; events: { slug: string } | { slug: string }[] };
  const ev = Array.isArray(row.events) ? row.events[0] : row.events;
  return { id: row.id, event_id: row.event_id, slug: ev?.slug ?? "" };
}
