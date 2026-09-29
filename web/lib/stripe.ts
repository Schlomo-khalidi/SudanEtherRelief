/** Minimal Stripe Checkout wrapper — raw REST, no SDK dependency.
 *  Works with a TEST-mode secret key (sk_test_…) for the demo loop; the same
 *  code runs against a live Ethar-owned key in production. */

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status?: string;
  amount_total?: number;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(opts: {
  amountCents: number;
  currency?: string;
  eventSlug: string;
  eventName: string;
  ref?: string;
  origin: string;
}): Promise<CheckoutSession> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${opts.origin}/api/donate/confirm?session_id={CHECKOUT_SESSION_ID}&code=${encodeURIComponent(opts.ref ?? "")}&slug=${encodeURIComponent(opts.eventSlug)}`);
  body.set("cancel_url", `${opts.origin}/event/${opts.eventSlug}?canceled=1`);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", opts.currency ?? "usd");
  body.set("line_items[0][price_data][unit_amount]", String(opts.amountCents));
  body.set("line_items[0][price_data][product_data][name]", `Ethar Relief — ${opts.eventName.slice(0, 90)}`);
  body.set("line_items[0][price_data][product_data][description]", "Witness Relay tracked donation · 100% to field work");
  body.set("metadata[ref]", opts.ref ?? "DIRECT");
  body.set("metadata[event_slug]", opts.eventSlug);
  body.set("submit_type", "donate");

  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json()) as CheckoutSession & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `stripe ${res.status}`);
  return data;
}

export async function retrieveSession(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(`${API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json()) as CheckoutSession & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `stripe ${res.status}`);
  return data;
}

/** Stripe signature check for the webhook route (v1 scheme). */
export async function verifyStripeSignature(req: Request, secret: string): Promise<boolean> {
  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const payload = await req.text();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}
