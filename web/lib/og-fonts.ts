export type OgWeight = 400 | 500 | 600 | 700;
export type OgFont = { name: string; data: ArrayBuffer; weight: OgWeight; style: "normal" };

const cache = new Map<string, ArrayBuffer>();

/**
 * Fetches a TTF for satori/next-og from Google Fonts.
 * An old User-Agent makes the css2 endpoint return TTF urls (satori can't use woff2).
 * Returns null on any failure so OG images still render with the default font.
 */
export async function loadOgFont(family: string, weight: OgWeight): Promise<OgFont | null> {
  const key = `${family}:${weight}`;
  if (cache.has(key)) {
    return { name: family, data: cache.get(key)!, weight, style: "normal" };
  }
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`;
    const css = await fetch(cssUrl, { headers: { "User-Agent": "curl/8.0" } }).then((r) => r.text());
    const m = css.match(/url\((https:[^)]+?\.ttf)\)/);
    if (!m) return null;
    const data = await fetch(m[1]).then((r) => r.arrayBuffer());
    cache.set(key, data);
    return { name: family, data, weight, style: "normal" };
  } catch {
    return null;
  }
}
