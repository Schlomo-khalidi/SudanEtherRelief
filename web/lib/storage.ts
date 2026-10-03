import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "witness-uploads";
let bucketReady = false;

/** Creates the public bucket once (service role). Safe to call repeatedly. */
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await supabaseAdmin().storage.createBucket(BUCKET, { public: true });
  } catch {
    /* bucket already exists */
  }
  bucketReady = true;
}

function looksLikeImage(bytes: Uint8Array): boolean {
  // JPEG (FFD8FF), PNG (89504E47), WEBP (RIFF....WEBP), GIF (GIF8)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  return false;
}

/**
 * Downloads an image from a source article, validates it, and stores it in
 * Supabase Storage (public bucket). Returns the public URL, or null on any
 * failure — a story without an image simply publishes text-only.
 */
export async function storeEventImage(imageUrl: string, slug: string): Promise<string | null> {
  try {
    await ensureBucket();
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "WitnessRelay/0.1 (+news monitoring)" },
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 3_000 || bytes.length > 8_000_000) return null;
    if (!looksLikeImage(bytes)) return null;

    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
    const path = `events/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, bytes, {
      contentType: type || "image/jpeg",
      upsert: false,
    });
    if (error) return null;

    const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
