"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_COOKIE, adminPassword, editorName, makeToken, verifyToken } from "@/lib/admin-auth";

/** service-role db handle for the newsroom (server only) */
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function requireEditor() {
  const jar = await cookies();
  const ok = await verifyToken(jar.get(ADMIN_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
}

/* ---------------- auth ---------------- */

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== adminPassword()) redirect("/admin/login?e=1");
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* ---------------- editorial decisions ---------------- */

export async function decide(formData: FormData) {
  await requireEditor();
  const eventId = String(formData.get("eventId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const statusByAction: Record<string, "approved" | "in_review" | "paused" | "archived"> = {
    approve: "approved",
    request_edit: "in_review",
    pause: "paused",
    reject: "archived",
  };
  const status = statusByAction[action];
  if (!eventId || !status) redirect(`/admin?e=${eventId}&err=unknown-action`);

  const dbi = db();
  const { error } = await dbi.from("events").update({ status }).eq("id", eventId);
  if (error) redirect(`/admin?e=${eventId}&err=${encodeURIComponent(error.message)}`);

  await dbi.from("editorial_decisions").insert({
    event_id: eventId,
    actor: editorName(),
    action,
    note: note || null,
  });

  revalidatePath("/admin");
  revalidatePath("/");
  if (slug) revalidatePath(`/event/${slug}`);
  redirect(`/admin?e=${eventId}&ok=${action}`);
}

export async function updateHeadline(formData: FormData) {
  await requireEditor();
  const eventId = String(formData.get("eventId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const headline = String(formData.get("headline") ?? "").trim();
  if (!eventId || !headline) redirect(`/admin?e=${eventId}&err=empty-headline`);

  const dbi = db();
  const { error } = await dbi.from("events").update({ headline }).eq("id", eventId);
  if (error) redirect(`/admin?e=${eventId}&err=${encodeURIComponent(error.message)}`);

  await dbi.from("story_packs").update({ headline }).eq("event_id", eventId).eq("status", "current");
  await dbi.from("editorial_decisions").insert({
    event_id: eventId,
    actor: editorName(),
    action: "revise",
    note: "headline edited",
  });

  revalidatePath("/admin");
  revalidatePath("/");
  if (slug) revalidatePath(`/event/${slug}`);
  redirect(`/admin?e=${eventId}&ok=headline`);
}

/* ---------------- ingest (Layer 2) ---------------- */

export async function runIngestNow() {
  await requireEditor();
  const { runIngest } = await import("@/lib/ingest");
  const summary = await runIngest();
  const params = new URLSearchParams({
    ingested: String(summary.newEvents.length),
    attached: String(summary.attached),
    candidates: String(summary.candidates),
    fetched: String(summary.fetched),
  });
  if (summary.newEvents.length) {
    params.set("newSlugs", summary.newEvents.map((n) => n.slug).join(",").slice(0, 200));
  }
  if (summary.errors.length) {
    params.set("ingestErr", summary.errors.slice(0, 2).join(" | ").slice(0, 280));
  }
  revalidatePath("/admin");
  redirect(`/admin?${params}`);
}

/* ---------------- donation reconciliation ---------------- */

export async function reconcile(formData: FormData) {
  await requireEditor();
  const raw = String(formData.get("csv") ?? "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const dbi = db();
  let imported = 0;
  const skipped: string[] = [];

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 2 || /^code$/i.test(parts[0])) continue; // header or junk
    const ref = parts[0];
    const amount = Number(parts[1]);
    if (!ref || !isFinite(amount) || amount <= 0) {
      skipped.push(`${ref || "?"} — unreadable amount`);
      continue;
    }
    const when = parts[2] && !isNaN(Date.parse(parts[2])) ? new Date(parts[2]).toISOString() : new Date().toISOString();

    if (ref.toUpperCase().startsWith("DIRECT:")) {
      // manual gift with no relay link: attribute straight to the event by slug
      const slug = ref.slice("DIRECT:".length).trim();
      const { data: ev } = await dbi.from("events").select("id").eq("slug", slug).maybeSingle();
      if (!ev) {
        skipped.push(`${ref} — event slug not found`);
        continue;
      }
      const { error } = await dbi.from("donation_attributions").insert({
        event_id: ev.id,
        method: "csv_reconcile",
        status: "confirmed",
        amount,
        currency: parts[3] || "USD",
        external_ref: ref,
        confirmed_at: when,
      });
      if (error) skipped.push(`${ref} — ${error.message}`);
      else imported++;
      continue;
    }

    const { data: link } = await dbi
      .from("share_links")
      .select("id, event_id")
      .eq("code", ref.toUpperCase())
      .maybeSingle();
    if (!link) {
      skipped.push(`${ref} — share link not found`);
      continue;
    }
    const { error } = await dbi.from("donation_attributions").insert({
      event_id: link.event_id,
      share_link_id: link.id,
      method: "csv_reconcile",
      status: "confirmed",
      amount,
      currency: parts[3] || "USD",
      external_ref: ref,
      confirmed_at: when,
    });
    if (error) skipped.push(`${ref} — ${error.message}`);
    else imported++;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  const msg = skipped.length ? encodeURIComponent(skipped.join(" | ")) : "";
  redirect(`/admin/reconcile?ok=${imported}&skip=${skipped.length}&msg=${msg}`);
}
