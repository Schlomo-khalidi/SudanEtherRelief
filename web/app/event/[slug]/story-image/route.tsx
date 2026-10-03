import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEventDetail } from "@/lib/queries";
import { loadOgFont } from "@/lib/og-fonts";

export const dynamic = "force-dynamic";

/** 1080×1920 story card — same identity as the OG card, vertical, with the field photo. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getEventDetail(slug);
  const headline = detail?.event.headline ?? "Witness Relay — news in. Donations out.";
  const place = (detail?.event.location_label ?? "Sudan & East Africa").toUpperCase();
  const confirmed = detail?.chain?.confirmed_amount ?? 0;
  const views = detail?.chain?.views ?? 0;

  const fonts = (
    await Promise.all([loadOgFont("Fraunces", 600), loadOgFont("IBM Plex Mono", 500)])
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  let photoSrc: string | null = null;
  const photoPath = detail?.photo?.path;
  if (photoPath) {
    try {
      if (photoPath.startsWith("http")) {
        const res = await fetch(photoPath, { signal: AbortSignal.timeout(15_000) });
        if (res.ok) photoSrc = `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
      } else {
        const buf = await readFile(join(process.cwd(), "public", photoPath.replace(/^\//, "")));
        photoSrc = `data:image/jpeg;base64,${buf.toString("base64")}`;
      }
    } catch {
      photoSrc = null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#221c44",
          color: "#fff",
        }}
      >
        {photoSrc ? (
          <div style={{ display: "flex", height: 760, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc} width={1080} height={760} style={{ objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 24,
                background: "rgba(30,127,79,.95)",
                color: "#fff",
                fontFamily: "IBM Plex Mono",
                fontSize: 20,
                letterSpacing: 2,
                padding: "8px 14px",
                borderRadius: 8,
              }}
            >
              ${detail?.photo?.kind === "source" ? `IMAGE: ${detail.photo.credit.toUpperCase()}` : detail?.photo?.kind === "field" ? "ETHAR FIELD ASSET" : "ETHAR RELIEF — ILLUSTRATIVE"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", height: 220, background: "linear-gradient(135deg, #221c44, #322a5e)" }} />
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "54px 64px 46px", borderTop: "14px solid #e8442e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="46" height="46" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="15.5" fill="none" stroke="#ff8a75" strokeWidth="2" />
              <path d="M12 17.5l3.4 3.4L22.5 13.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontFamily: "Fraunces", fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center" }}>
              {`Witness `}
              <span style={{ color: "#ff8a75" }}>{`Relay`}</span>
            </div>
            <div style={{ marginLeft: "auto", fontFamily: "IBM Plex Mono", fontSize: 15, color: "#7fd3a8", letterSpacing: 2 }}>
              {`HUMAN APPROVED`}
            </div>
          </div>

          <div style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 66, lineHeight: 1.14, marginTop: 44 }}>
            {headline}
          </div>
          <div style={{ fontFamily: "IBM Plex Mono", fontSize: 20, letterSpacing: 2, color: "#ff8a75", marginTop: 24 }}>
            {place}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", marginTop: "auto", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ fontFamily: "Fraunces", fontSize: 48 }}>{views}</b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 16, letterSpacing: 2, color: "#9d96c9" }}>TRACKED VIEWS</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ fontFamily: "Fraunces", fontSize: 48, color: "#7fd3a8" }}>
                {`$${Math.round(Number(confirmed)).toLocaleString("en-US")}`}
              </b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 16, letterSpacing: 2, color: "#9d96c9" }}>CONFIRMED DONATED</span>
            </div>
            <div
              style={{
                marginLeft: "auto",
                background: "#e8442e",
                borderRadius: 16,
                padding: "24px 32px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <b style={{ fontFamily: "Fraunces", fontSize: 27 }}>{`See the sources. Give if moved.`}</b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 15, color: "#ffd9d1", letterSpacing: 1 }}>
                {`WITH ETHAR RELIEF`}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts },
  );
}
