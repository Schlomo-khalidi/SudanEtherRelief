import Parser from "rss-parser";

export type RawItem = {
  outlet: string;
  title: string;
  url: string;
  published: string | null;
  snippet: string;
};

const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "curl/8.0" } });

type Adapter = { outlet: string; kind: "rss" | "gdelt"; url: string };

const ADAPTERS: Adapter[] = [
  // Verified working (probed 2026-09-29):
  //  - ReliefWeb + AllAfrica require a curl-style UA ("Mozilla/5.0" gets empty bodies)
  //  - Radio Dabanga has shut down public RSS (all /feed paths serve HTML)
  //  - Sudan Tribune hard-blocks bots (403) — revisit via their API if Ethar partners
  //  - GDELT rate-limits (429) intermittently — tolerate and retry next run
  { outlet: "ReliefWeb", kind: "rss", url: "https://reliefweb.int/updates/rss.xml" },
  { outlet: "AllAfrica Sudan", kind: "rss", url: "https://allafrica.com/tools/headlines/rdf/sudan/headlines.rdf" },
  {
    outlet: "GDELT",
    kind: "gdelt",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=sudan%20sourcelang%3Aenglish&mode=artlist&format=json&maxrecords=20&timespan=2d",
  },
];

function strip(html: string | undefined, max = 320): string {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, max);
}

async function fetchRss(a: Adapter): Promise<RawItem[]> {
  const feed = await parser.parseURL(a.url);
  return (feed.items ?? []).slice(0, 10).map((i) => ({
    outlet: a.outlet,
    title: strip(i.title, 200),
    url: (i.link ?? "").split("?")[0],
    published: i.isoDate ?? (i.pubDate ? new Date(i.pubDate).toISOString() : null),
    snippet: strip(i.contentSnippet ?? i.content),
  }));
}

async function fetchGdelt(a: Adapter): Promise<RawItem[]> {
  const res = await fetch(a.url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`gdelt ${res.status}`);
  const data = (await res.json()) as { articles?: { url: string; title: string; seendate?: string; domain?: string }[] };
  return (data.articles ?? []).slice(0, 15).map((art) => ({
    outlet: art.domain ?? a.outlet,
    title: strip(art.title, 200),
    url: art.url,
    published: art.seendate
      ? `${art.seendate.slice(0, 4)}-${art.seendate.slice(4, 6)}-${art.seendate.slice(6, 8)}T${art.seendate.slice(9, 11)}:${art.seendate.slice(11, 13)}:00Z`
      : null,
    snippet: "",
  }));
}

export async function fetchAllItems(): Promise<{ items: RawItem[]; errors: string[] }> {
  const errors: string[] = [];
  const results = await Promise.allSettled(
    ADAPTERS.map(async (a) => (a.kind === "rss" ? fetchRss(a) : fetchGdelt(a))),
  );
  const items: RawItem[] = [];
  results.forEach((r, i) => {
    const a = ADAPTERS[i];
    if (r.status === "fulfilled") items.push(...r.value);
    else errors.push(`${a.outlet}: ${String(r.reason).slice(0, 120)}`);
  });
  return { items, errors };
}

export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
