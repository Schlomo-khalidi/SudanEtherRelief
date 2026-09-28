import { cookies } from "next/headers";

/**
 * Prototype relayer session: signed, expiring cookie holding the relayer id.
 * (Email-only identity — no password. Production would upgrade to Supabase
 * Auth magic links; dashboard code only depends on getRelayerId below.)
 */
export const RELAYER_COOKIE = "wr_relayer";

const enc = new TextEncoder();

function secret() {
  return "wr-relayer::" + (process.env.CRON_SECRET ?? "dev");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeRelayerToken(relayerId: string, ttlMs = 1000 * 60 * 60 * 24 * 30): Promise<string> {
  const exp = String(Date.now() + ttlMs);
  return `${relayerId}.${exp}.${await hmac(`${relayerId}:${exp}`)}`;
}

export async function getRelayerId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(RELAYER_COOKIE)?.value;
  if (!token) return null;
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig) return null;
  if (Number(exp) < Date.now()) return null;
  if ((await hmac(`${id}:${exp}`)) !== sig) return null;
  return id;
}
