import { ImageResponse } from "next/og";
import { getEventDetail } from "@/lib/queries";
import { loadOgFont } from "@/lib/og-fonts";
import { money, num } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getEventDetail(slug);

  const headline = detail?.event.headline ?? "Witness Relay — news in. Donations out.";
  const place = (detail?.event.location_label ?? "Sudan & East Africa").toUpperCase();
  const sources = detail?.sources.length ?? 0;
  const relayers = num(detail?.chain?.relayers_count ?? 0);
  const confirmed = money(detail?.chain?.confirmed_amount ?? 0);

  const headlineSize = headline.length > 110 ? 42 : headline.length > 70 ? 50 : 60;

  const fonts = (
    await Promise.all([loadOgFont("Fraunces", 600), loadOgFont("IBM Plex Mono", 500)])
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #221c44 0%, #2c2456 60%, #322a5e 100%)",
          color: "#fff",
          padding: "58px 70px 52px 84px",
          borderLeft: "14px solid #e8442e",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="54" height="54" viewBox="0 0 34 34">
            <circle cx="17" cy="17" r="15.5" fill="none" stroke="#ff8a75" strokeWidth="2" />
            <path d="M12 17.5l3.4 3.4L22.5 13.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontFamily: "Fraunces", fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center" }}>
            {`Witness `}
            <span style={{ color: "#ff8a75" }}>Relay</span>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "IBM Plex Mono", fontSize: 15, letterSpacing: 2, color: "#9d96c9" }}>
            {`WITNESS VERIFIED · ${sources} CITED SOURCES`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 32, flex: 1 }}>
          <div style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: headlineSize, lineHeight: 1.08, maxWidth: 980 }}>
            {headline}
          </div>
          <div style={{ fontFamily: "IBM Plex Mono", fontSize: 18, letterSpacing: 2, color: "#ff8a75", marginTop: 18 }}>
            {place}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 34, marginTop: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ fontFamily: "Fraunces", fontSize: 34 }}>{relayers}</b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: 2, color: "#9d96c9" }}>RELAYERS CARRYING</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ fontFamily: "Fraunces", fontSize: 34, color: "#7fd3a8" }}>{confirmed}</b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: 2, color: "#9d96c9" }}>CONFIRMED DONATED</span>
            </div>
            <div
              style={{
                marginLeft: "auto",
                background: "#e8442e",
                color: "#fff",
                borderRadius: 14,
                padding: "18px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <b style={{ fontFamily: "Fraunces", fontSize: 23 }}>See the sources. Give if moved.</b>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: 1, color: "#ffd9d1" }}>
                WITNESSRELAY.ORG · WITH ETHAR RELIEF
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
