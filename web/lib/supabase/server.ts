import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Prototype access model (see supabase/migrations/0001_init.sql):
 * - the public site reads APPROVED rows with the anon key (RLS-enforced)
 * - every write (ingest, decisions, tracking, reconciliation) uses the
 *   service-role key on the server only — never expose it to the client.
 *
 * TODO(L1): replace with generated Database types after first migration run.
 */

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return admin;
}

let anon: SupabaseClient | null = null;

export function supabasePublic(): SupabaseClient {
  if (!anon) {
    anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return anon;
}
