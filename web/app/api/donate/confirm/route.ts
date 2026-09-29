import { supabaseAdmin } from "@/lib/supabase/server";
import { retrieveSession, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe Checkout success landing: retrieves the session server-side and
 * attributes the payment. Works locally without webhook forwarding; the
 * /api/webhooks/stripe route remains the production-grade path (retries).
 * Idempotent by external_ref = session id.
 *
 * GET /api/donate/confirm?session_id=cs_test_...&code=KHRBGN&slug=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const code = url.searchParams.get("code")?.toUpperCase() || null;
  const slug = url.searchParams.get("slug") ?? "";

  if (!stripeConfigured() || !sessionId) {
    return Response.redirect(new URL(slug ? `/event/${slug}` : "/", url.origin), 303);
  }

  try {
    const session = await retrieveSession(sessionId);
    if (session.payment_status !== "paid") {
      return Response.redirect(new URL(slug ? `/event/${slug}?not_paid=1` : "/", url.origin), 303);
    }

    const db = supabaseAdmin();
    const { data: existing } = await db
      .from("donation_attributions")
      .select("id")
      .eq("external_ref", session.id)
      .maybeSingle();
    if (existing) {
      return Response.redirect(new URL(slug ? `/event/${slug}?via=${code ?? ""}&thanks=1` : "/", url.origin), 303);
    }

    // resolve the event: metadata first, then the relay code
    let eventId: string | undefined;
    const metaSlug = session.metadata?.event_slug;
    if (metaSlug) {
      const { data: ev } = await db.from("events").select("id").eq("slug", metaSlug).maybeSingle();
      eventId = ev?.id;
    }
    if (!eventId && code) {
      const { data: link } = await db
        .from("share_links")
        .select("id, event_id")
        .eq("code", code)
        .maybeSingle();
      if (link) eventId = link.event_id;
    }
    if (!eventId) {
      return Response.redirect(new URL(slug ? `/event/${slug}?via=${code ?? ""}` : "/", url.origin), 303);
    }

    let shareLinkId: string | null = null;
    if (code) {
      const { data: link } = await db
        .from("share_links")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      shareLinkId = link?.id ?? null;
    }

    const { error } = await db.from("donation_attributions").insert({
      event_id: eventId,
      share_link_id: shareLinkId,
      method: "stripe",
      status: "confirmed",
      amount: (session.amount_total ?? 0) / 100,
      currency: "USD",
      external_ref: session.id,
      confirmed_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    return Response.redirect(new URL(`/event/${slug}?via=${code ?? ""}&thanks=1`, url.origin), 303);
  } catch (e) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(e, { extra: { sessionId } });
    return Response.redirect(new URL(slug ? `/event/${slug}?donate_error=1` : "/", url.origin), 303);
  }
}
