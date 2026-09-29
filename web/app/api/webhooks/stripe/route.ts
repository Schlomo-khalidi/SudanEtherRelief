import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyStripeSignature } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Production-grade Stripe webhook (checkout.session.completed). The
 * /api/donate/confirm landing already attributes on success; this route is
 * the durable path — catches async payments and retries. Idempotent by
 * external_ref = session id.
 *
 * Set STRIPE_WEBHOOK_SECRET (whsec_…) when adding the endpoint in the
 * Stripe dashboard; without it the route refuses to trust payloads.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });
  }
  if (!(await verifyStripeSignature(req.clone(), secret))) {
    return Response.json({ ok: false, error: "bad signature" }, { status: 400 });
  }

  const event = (await req.json()) as { type?: string; data?: { object?: Record<string, unknown> } };
  if (event.type !== "checkout.session.completed") {
    return Response.json({ ok: true, ignored: event.type });
  }
  const session = (event.data?.object ?? {}) as {
    id: string;
    payment_status?: string;
    amount_total?: number;
    metadata?: { ref?: string; event_slug?: string };
  };

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("donation_attributions")
    .select("id")
    .eq("external_ref", session.id)
    .maybeSingle();
  if (existing) return Response.json({ ok: true, idempotent: true });

  let eventId: string | undefined;
  let shareLinkId: string | null = null;
  const code = session.metadata?.ref?.toUpperCase();
  if (code && !code.startsWith("DIRECT")) {
    const { data: link } = await db.from("share_links").select("id, event_id").eq("code", code).maybeSingle();
    if (link) {
      shareLinkId = link.id;
      eventId = link.event_id;
    }
  }
  if (!eventId && session.metadata?.event_slug) {
    const { data: ev } = await db.from("events").select("id").eq("slug", session.metadata.event_slug).maybeSingle();
    eventId = ev?.id;
  }
  if (!eventId || session.payment_status !== "paid") {
    return Response.json({ ok: true, attributed: false });
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
  if (error) {
    Sentry.captureException(error, { extra: { session: session.id } });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, attributed: true, method: "stripe" });
}
