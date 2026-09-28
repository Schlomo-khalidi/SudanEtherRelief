import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = "unconfigured";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error } = await supabaseAdmin().from("events").select("id").limit(1);
    db = error ? `error: ${error.message}` : "ok";
  }
  return Response.json({ ok: true, service: "witness-relay", db, ts: new Date().toISOString() });
}
