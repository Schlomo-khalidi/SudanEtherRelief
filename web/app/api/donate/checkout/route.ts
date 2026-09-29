import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createCheckoutSession, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Give tap with an amount: logs the attributed click (when a relay code is
 * present) and opens Stripe Checkout. Priority: Stripe (if configured) →
 * LaunchGood redirect (if DONATION_BASE_URL set) → back to the event page.
 *
 * GET /api/donate/checkout?code=KHRBGN&amount=40&event=zamzam-famine-confirmed
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim().toUpperCase() || undefined;
  const amount = Math.round(Number(url.searchParams.get("amount") ?? "0") * 100);
  const slug = url.searchParams.get("event");
  const origin = url.origin;

  if (stripeConfigured()) {
    if (!slug || !Number.isFinite(amount) || amount < 100) {
      return Response.redirect(new URL("/", req.url), 303);
    }
    const db = supabaseAdmin();
    const { data: ev } = await db.from("events").select("id, headline").eq("slug", slug).maybeSingle();
    if (!ev) return Response.redirect(new URL("/", req.url), 303);

    // the attributed Give tap counts as a click only when it came through a relay link
    if (code) {
      const { data: link } = await db
        .from("share_links")
        .select("id, event_id")
        .eq("code", code)
        .maybeSingle();
      if (link) {
        await db.from("donation_clicks").insert({
          share_link_id: link.id,
          event_id: link.event_id,
          user_agent: req.headers.get("user-agent"),
        });
      }
    }

    try {
      const session = await createCheckoutSession({
        amountCents: amount,
        eventSlug: slug,
        eventName: ev.headline,
        ref: code,
        origin,
      });
      if (!session.url) throw new Error("stripe returned no checkout url");
      return Response.redirect(session.url, 303);
    } catch (e) {
      Sentry.captureException(e, { extra: { slug, amount } });
      return Response.redirect(new URL(`/event/${slug}?donate_error=1`, req.url), 303);
    }
  }

  if (process.env.DONATION_BASE_URL) {
    const joiner = process.env.DONATION_BASE_URL.includes("?") ? "&" : "?";
    const ref = code ? `ref=${encodeURIComponent(code)}` : "";
    return Response.redirect(new URL(`${process.env.DONATION_BASE_URL}${joiner}${ref}`), 303);
  }

  return Response.redirect(new URL(slug ? `/event/${slug}#give` : "/"), 303);
}
