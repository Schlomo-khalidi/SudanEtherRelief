import { supabaseAdmin } from "@/lib/supabase/server";
import { getShareLink } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Tracked redirect: /r/[CODE] → event page with attribution.
 * A hit here = one attributed VIEW on the event's chain.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
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
