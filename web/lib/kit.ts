/** Share-kit copy builders — every text is pre-approved wording around the
 *  relayer's personal tracked link. EN + AR. */

export type KitTexts = { whatsapp: string; instagram: string; script: string };

export function buildKit(opts: {
  headline: string;
  location: string;
  link: string;
  confirmed?: string;
  lang: "en" | "ar";
}): KitTexts {
  const { headline, location, link, confirmed, lang } = opts;

  if (lang === "ar") {
    return {
      whatsapp: `خبر موثّق وليس رسالة متداولة — ${headline} (${location}). المصادر مذكورة وتبرعك يذهب مباشرة للاستجابة: ${link}`,
      instagram: `مجاعة مؤكدة. ${location} — والممر ما زال مغلقاً.\n\nأنا أنقل هذا الخبر لأن البطاقة موثّقة بمصادرها، وتُظهر ما تشتريه ٤٠ دولار هذا الأسبوع فعلياً.\n\n#السودان #ازمة_السودان — الرابط في البايو مرتبط بحسابي`,
      script: `٠-٣ ثوانٍ: ${headline}\n٣-٨: لماذا يهم الآن — التغطية تُبقي ممرات الإمداد مفتوحة.\n٨-١٢: ماذا يقدّم التبرع هذا الأسبوع بالتحديد.\n١٢-١٥: «المصادر في البطاقة. تبرّع إذا تأثرت.» — ${link}`,
    };
  }

  return {
    whatsapp: `Verified news, not a chain message — ${headline} (${location}). Every claim carries its source, and 100% of gifts go to Ethar Relief field work: ${link}`,
    instagram: `Famine, confirmed. ${location} — and the corridor is still closed.\n\nI'm relaying this because the card is sourced: citations attached, editor-approved, and it shows what $40 actually buys this week.${confirmed ? ` $${confirmed} confirmed so far through tracked links.` : ""}\n\n#Sudan #KeepSudanOnTheFeed — link in bio, tagged to my relay: ${link}`,
    script: `0-3s: Cold open — "${headline}".\n3-8s: Why now — when the story leaves the news, funding leaves with it. Coverage is logistics.\n8-12s: What a donation buys this week, specifically (card shows the Ethar-approved ask).\n12-15s: Close — "See the sources. Give if moved." ${link}`,
  };
}
