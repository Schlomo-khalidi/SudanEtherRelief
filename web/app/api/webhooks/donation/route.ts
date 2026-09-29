import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Donation webhook stub (Layer 6).
 *
 * Real payment-processor callbacks (LaunchGood or otherwise) POST here; each
 * verified payload becomes a CONFIRMED attribution with method='webhook' —
 * this is the "payment reference" case, so no human reconciliation needed.
 * When LaunchGood confirms their signing scheme, verify it in `authorized()`
 * and drop the shared-secret shortcut.
 *
 * Body: { "ref": "ZA2GLP" | "DIRECT:event-slug", "amount": 25, "currency"?: "USD", "date"?: "ISO" }
 * Auth:  Authorization: Bearer <CRON_SECRET>  (header name: x-wr-secret also accepted)
 */

const Payload = z.object({
  ref: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("USD"),
  date: z.string().optional(),
});

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    req.headers.get("x-wr-secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  return provided === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof Payload>;
  try {
    payload = Payload.parse(await req.json());
  } catch (e) {
    return Response.json({ ok: false, error: `bad payload: ${String(e).slice(0, 200)}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const ref = payload.ref.trim();
  const confirmedAt = payload.date && !isNaN(Date.parse(payload.date)) ? new Date(payload.date).toISOString() : new Date().toISOString();

  if (ref.toUpperCase().startsWith("DIRECT:")) {
    const slug = ref.slice("DIRECT:".length).trim();
    const { data: ev } = await db.from("events").select("id").eq("slug", slug).maybeSingle();
    if (!ev) return Response.json({ ok: false, reason: `event slug not found: ${slug}` });
    const { error } = await db.from("donation_attributions").insert({
      event_id: ev.id,
      method: "webhook",
      status: "confirmed",
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      external_ref: ref,
      confirmed_at: confirmedAt,
    });
    if (error) {
      Sentry.captureException(error, { extra: { ref, amount: payload.amount } });
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, attributed: ref, amount: payload.amount, method: "webhook" });
  }

  const { data: link } = await db
    .from("share_links")
    .select("id, event_id")
    .eq("code", ref.toUpperCase())
    .maybeSingle();
  if (!link) {
    // 200 so the provider doesn't retry forever on unknown codes; surfaced as not-attributed
    return Response.json({ ok: false, reason: `share link not found: ${ref}` });
  }

  const { error } = await db.from("donation_attributions").insert({
    event_id: link.event_id,
    share_link_id: link.id,
    method: "webhook",
    status: "confirmed",
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    external_ref: ref,
    confirmed_at: confirmedAt,
  });
  if (error) {
    Sentry.captureException(error, { extra: { ref, amount: payload.amount } });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, attributed: ref, amount: payload.amount, method: "webhook" });
}
