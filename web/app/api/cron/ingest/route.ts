import { runIngest } from "@/lib/ingest";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby-plan ceiling; Pro can raise it

/**
 * Cron entry. Vercel's scheduler (vercel.json, daily on the Hobby plan) sends
 * `x-vercel-cron: 1` and cannot interpolate env vars into the path — so the
 * platform header authorizes scheduled runs, while external callers use the
 * shared secret. Bump the schedule to *\/30 and maxDuration with Vercel Pro.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  const platformCron = req.headers.get("x-vercel-cron") === "1";
  if (!platformCron && secret && provided !== secret) {
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
