/**
 * Prototype staff gate for /admin.
 * A signed, expiring cookie issued after the staff password check.
 * (Production would use Supabase Auth magic links — swap-in ready, the
 * middleware/actions only depend on verifyToken below.)
 */
export const ADMIN_COOKIE = "wr_admin";

const enc = new TextEncoder();

function staffSecret() {
  return "wr-admin::" + (process.env.ADMIN_PASSWORD ?? "witness-demo") + "::" + (process.env.CRON_SECRET ?? "dev");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(staffSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeToken(ttlMs = 1000 * 60 * 60 * 24 * 7): Promise<string> {
  const exp = String(Date.now() + ttlMs);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return (await hmac(exp)) === sig;
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "witness-demo";
}

export function editorName(): string {
  return process.env.EDITOR_NAME ?? "Editor";
}
