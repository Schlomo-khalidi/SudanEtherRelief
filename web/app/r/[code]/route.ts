import { supabaseAdmin } from "@/lib/supabase/server";
import { getShareLink } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** naive per-IP sliding window — fine for a prototype, swap for Upstash at scale */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // bound memory
  return arr.length > 30;
}

/**
 * Tracked redirect: /r/[CODE] → event page with attribution.
 * A hit here = one attributed VIEW on the event's chain.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return new Response("Too many requests", { status: 429 });
  }

  const { code } = await params;
  const link = await getShareLink(code);

  if (!link || !link.slug) {
    return Response.redirect(new URL("/", req.url), 302);
  }

  await supabaseAdmin().from("link_views").insert({
    share_link_id: link.id,
    event_id: link.event_id,
    referrer: req.headers.get("referer"),
    user_agent: req.headers.get("user-agent"),
    country: req.headers.get("x-vercel-ip-country"),
  });

  return Response.redirect(new URL(`/event/${link.slug}?via=${encodeURIComponent(code.toUpperCase())}`, req.url), 302);
}
