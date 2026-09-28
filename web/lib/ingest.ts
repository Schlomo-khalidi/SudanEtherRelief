import { z } from "zod";
import { llmJson, llmConfigured } from "@/lib/llm";
import { fetchAllItems, normalizeTitle, type RawItem } from "@/lib/sources";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Layer 2 pipeline: fetch → dedupe → cluster → draft.
 * Hard rules enforced in code, not just prompts:
 *  - a claim without a resolvable source index is dropped
 *  - an event whose claims all drop is not created
 *  - donation asks are NEVER invented by the model (Ethar copies them separately)
 */

export type IngestSummary = {
  fetched: number;
  candidates: number;
  newEvents: { slug: string; headline: string; sources: number }[];
  attached: number;
  skippedIrrelevant: number;
  errors: string[];
};

const ClusterSchema = z.object({
  events: z.array(
    z.object({
      headline: z.string(),
      location: z.string().default("Sudan"),
      itemIndexes: z.array(z.number()).min(1),
      matchesExistingSlug: z.string().nullable().default(null),
      relevant: z.boolean().default(true),
    }),
  ),
});

const DraftSchema = z.object({
  headline: z.string(),
  location: z.string(),
  confidence: z.number().min(0).max(1),
  whyItMatters: z.string(),
  claims: z.array(z.object({ text: z.string(), sourceIdx: z.array(z.number()).min(1) })).min(1),
});

export async function runIngest(): Promise<IngestSummary> {
  const summary: IngestSummary = {
    fetched: 0,
    candidates: 0,
    newEvents: [],
    attached: 0,
    skippedIrrelevant: 0,
    errors: [],
  };

  if (!llmConfigured()) {
    summary.errors.push("LLM_API_KEY not set — pipeline idle");
    return summary;
  }
  const db = supabaseAdmin();

  /* 1 · fetch */
  const { items: raw, errors } = await fetchAllItems();
  summary.fetched = raw.length;
  summary.errors.push(...errors);

  /* 2 · dedupe (in-run + against stored urls) */
  const seen = new Set<string>();
  let candidates: RawItem[] = [];
  for (const it of raw) {
    if (!it.url || !it.title) continue;
    const urlKey = it.url;
    const titleKey = normalizeTitle(it.title);
    if (seen.has(urlKey) || seen.has(titleKey)) continue;
    seen.add(urlKey);
    seen.add(titleKey);
    candidates.push(it);
  }
  const { data: known } = await db.from("sources").select("url").order("fetched_at", { ascending: false }).limit(300);
  const knownUrls = new Set((known ?? []).map((k) => (k as { url: string }).url));
  candidates = candidates.filter((c) => !knownUrls.has(c.url));
  candidates = candidates
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""))
    .slice(0, 30);
  summary.candidates = candidates.length;
  if (candidates.length === 0) return summary;

  /* 3 · cluster against open stories */
  const { data: openEvents } = await db
    .from("events")
    .select("id, slug, headline")
    .in("status", ["draft", "in_review", "approved"]);
  const open = (openEvents ?? []) as { id: string; slug: string; headline: string }[];

  const clusterPrompt = `You are the clustering desk of a newsroom covering Sudan and East Africa.
Below are CANDIDATE items just fetched from wires and field feeds, and OPEN STORIES already in our system.

TASK:
1. Discard items that are not about Sudan / East Africa crises and response (set their index in no event).
2. Group the remaining candidates into distinct real-world events.
3. If a group is the same ongoing story as an OPEN STORY, set matchesExistingSlug to that story's slug; otherwise null.

Return JSON only: {"events":[{"headline":"...","location":"...","itemIndexes":[numbers],"matchesExistingSlug":null,"relevant":true}]}
Items with no matching event: omit them. Do not invent events with zero items.

CANDIDATES (index | outlet | title | snippet):
${candidates.map((c, i) => `${i} | ${c.outlet} | ${c.title} | ${c.snippet.slice(0, 160)}`).join("\n")}

OPEN STORIES (slug | headline):
${open.map((o) => `${o.slug} | ${o.headline}`).join("\n") || "(none)"}`;

  let clusters: z.infer<typeof ClusterSchema>;
  try {
    clusters = ClusterSchema.parse(await llmJson(clusterPrompt, { temperature: 0.1 }));
  } catch (e) {
    summary.errors.push(`cluster: ${String(e).slice(0, 200)}`);
    return summary;
  }

  /* 4 · per cluster: attach to existing or draft new */
  for (const cl of clusters.events) {
    if (!cl.relevant || cl.itemIndexes.length === 0) {
      summary.skippedIrrelevant++;
      continue;
    }
    const clusterItems = cl.itemIndexes
      .filter((i) => i >= 0 && i < candidates.length)
      .map((i) => candidates[i]);
    if (clusterItems.length === 0) continue;

    const eventId = cl.matchesExistingSlug ? open.find((o) => o.slug === cl.matchesExistingSlug)?.id : undefined;

    if (eventId) {
      // merge: attach any genuinely new sources to the open story
      const { data: existingUrls } = await db.from("sources").select("url").eq("event_id", eventId);
      const have = new Set((existingUrls ?? []).map((s) => (s as { url: string }).url));
      const fresh = clusterItems.filter((it) => !have.has(it.url));
      if (fresh.length > 0) {
        await db.from("sources").insert(fresh.map((it) => ({ event_id: eventId, ...sourceRow(it) })));
        await db.from("editorial_decisions").insert({
          event_id: eventId,
          actor: "system",
          action: "note",
          note: `ingest attached ${fresh.length} new source(s) (${clusterItems[0].outlet}…), queued for re-review`,
        });
        await db.from("events").update({ status: "in_review" }).eq("id", eventId);
        summary.attached += fresh.length;
      }
      continue;
    }

    /* draft new event */
    const draftPrompt = `You draft Witness Cards for a humanitarian newsroom. From ONLY the items below, draft one event.

RULES:
- Every claim must be supported by one or more of these items; cite the item index for each claim.
- Never invent figures, quotes, or causes. If items disagree, prefer the wire/UN/field sources.
- 2 to 4 claims, each one sentence, factual, dignified. No adjectives that the sources don't support.
- whyItMatters: 2 sentences max, explaining what attention changes operationally. No donation asks.

ITEMS:
${clusterItems.map((it, i) => `SOURCE ${i} | ${it.outlet} | ${it.published ?? "recent"} | ${it.title}\n${it.snippet}`).join("\n\n")}

Return JSON only: {"headline":"...","location":"...","confidence":0.0-1.0,"whyItMatters":"...","claims":[{"text":"...","sourceIdx":[numbers]}]}`;

    let draft: z.infer<typeof DraftSchema>;
    try {
      draft = DraftSchema.parse(await llmJson(draftPrompt, { temperature: 0.2 }));
    } catch (e) {
      summary.errors.push(`draft "${cl.headline.slice(0, 40)}": ${String(e).slice(0, 160)}`);
      continue;
    }

    // source-ID enforcement: drop claims with out-of-range indices
    const validClaims = draft.claims
      .map((c) => ({ ...c, sourceIdx: c.sourceIdx.filter((i) => i >= 0 && i < clusterItems.length) }))
      .filter((c) => c.sourceIdx.length > 0 && c.text.trim().length > 0);
    if (validClaims.length === 0) {
      summary.errors.push(`draft "${cl.headline.slice(0, 40)}": every claim lost its source — dropped`);
      continue;
    }

    const newest = clusterItems.map((i) => i.published ?? "").sort().at(-1) || new Date().toISOString();
    const base = draft.headline
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join("-")
      .replace(/^-+|-+$/g, "");
    const slug = `${base || "event"}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: ev, error: evErr } = await db
      .from("events")
      .insert({
        slug,
        headline: draft.headline,
        location_label: draft.location,
        happened_at: newest,
        status: "in_review",
        explainer_what: validClaims.map((c) => c.text).join(" "),
        explainer_why: draft.whyItMatters,
        is_demo: false,
      })
      .select("id")
      .single();
    if (evErr) {
      summary.errors.push(`insert event: ${evErr.message}`);
      continue;
    }

    const { data: srcs, error: srcErr } = await db
      .from("sources")
      .insert(clusterItems.map((it) => ({ event_id: ev!.id, ...sourceRow(it) })))
      .select("id");
    if (srcErr) {
      summary.errors.push(`insert sources: ${srcErr.message}`);
      continue;
    }

    const claims = validClaims.map((c) => ({
      text: c.text,
      sourceIds: c.sourceIdx.map((i) => srcs![i].id),
    }));
    await db.from("story_packs").insert({
      event_id: ev!.id,
      headline: draft.headline,
      claims,
      ai_confidence: draft.confidence,
      status: "current",
    });
    await db.from("editorial_decisions").insert({
      event_id: ev!.id,
      actor: "system",
      action: "auto_draft",
      note: `AI draft from ${clusterItems.length} sources · every claim source-bound · awaiting Gasser`,
    });

    summary.newEvents.push({ slug, headline: draft.headline, sources: clusterItems.length });
  }

  return summary;
}

function sourceRow(it: RawItem) {
  return {
    outlet: it.outlet,
    title: it.title,
    url: it.url,
    quote: it.snippet || it.title,
    published_at: it.published,
    is_field_report: /ethar|field memo/i.test(it.outlet),
  };
}
