import { runIngest } from "@/lib/ingest";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron entry (Vercel cron sends no secret header pre-configured; we accept
 * ?secret= or Authorization: Bearer). Wire in vercel.json every 30 min.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runIngest();
    if (summary.errors.length) {
      Sentry.captureMessage(`ingest completed with ${summary.errors.length} error(s)`, {
        level: "warning",
        extra: { errors: summary.errors, fetched: summary.fetched, newEvents: summary.newEvents.length },
      });
    }
    return Response.json({ ok: true, summary, ts: new Date().toISOString() });
  } catch (e) {
    Sentry.captureException(e);
    return Response.json({ ok: false, error: String(e).slice(0, 400) }, { status: 500 });
  }
}
