import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

/** Wiring check: hit this once after deploy — the returned event id should
 *  appear in the Sentry dashboard within seconds. Keep gated by the cron secret. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided = url.searchParams.get("secret");
  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const eventId = Sentry.captureMessage("Witness Relay — Sentry wiring test", "info");
  await Sentry.flush(4000);
  return Response.json({ ok: true, eventId, note: "check the Sentry dashboard for this event" });
}
