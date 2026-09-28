import { supabaseAdmin } from "@/lib/supabase/server";
import { getShareLink } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Give tap from an attributed session: /api/track/click?code=XXX
 * A hit here = one tracked CLICK on the event's chain, then onward to the
 * donation campaign with the ref code attached.
 * If DONATION_BASE_URL is unset, we bounce back to the event page (no click
 * is logged — a tap that can't reach a donation page is not counted).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const base = process.env.DONATION_BASE_URL;

  if (!code || !base) {
    return Response.redirect(new URL("/", req.url), 302);
  }

  const link = await getShareLink(code);
  if (!link) {
    return Response.redirect(new URL("/", req.url), 302);
  }

  await supabaseAdmin().from("donation_clicks").insert({
    share_link_id: link.id,
    event_id: link.event_id,
    user_agent: req.headers.get("user-agent"),
  });

  const joiner = base.includes("?") ? "&" : "?";
  return Response.redirect(new URL(`${base}${joiner}ref=${encodeURIComponent(code.toUpperCase())}`), 302);
}
