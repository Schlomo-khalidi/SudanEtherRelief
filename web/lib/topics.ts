import type { EventRow } from "@/lib/types";

export const TOPIC_CHIPS = [
  { slug: "sudan", label: "Sudan" },
  { slug: "east-africa", label: "East Africa" },
  { slug: "famine-food", label: "Famine & food" },
  { slug: "health", label: "Health" },
  { slug: "displacement", label: "Displacement" },
] as const;

export type TopicSlug = (typeof TOPIC_CHIPS)[number]["slug"];

export function isTopicSlug(v: string | undefined | null): v is TopicSlug {
  return TOPIC_CHIPS.some((c) => c.slug === v);
}

const RULES: { slug: TopicSlug; re: RegExp }[] = [
  {
    slug: "east-africa",
    re: /djibouti|ethiopia|eritrea|somalia|kenya|uganda|rwanda|burundi|tanzania/i,
  },
  {
    slug: "famine-food",
    re: /famine|food|nutrition|malnutrition|hunger|agricultur|\bipc\b/i,
  },
  {
    slug: "health",
    re: /cholera|health|hospital|clinic|disease|outbreak|water|vaccin/i,
  },
  {
    slug: "displacement",
    re: /displac|refugee|\bcamp\b|fleeing|fled|\bidps?\b/i,
  },
];

/** Topic tags derived from the event's own sourced text — no manual tagging. */
export function topicsFor(event: EventRow, bodyText: string): TopicSlug[] {
  const hay = `${event.headline} ${event.location_label ?? ""} ${bodyText}`;
  const tags: TopicSlug[] = [];
  if (/sudan/i.test(hay)) tags.push("sudan");
  for (const r of RULES) if (r.re.test(hay)) tags.push(r.slug);
  return tags;
}
