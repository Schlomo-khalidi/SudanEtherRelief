import type { EventRow } from "@/lib/types";

/**
 * Topic-matched image library — pre-cleared Ethar Relief photos that
 * pipeline-drafted events fall back to automatically, so no event publishes
 * without imagery and no one has to upload a picture per story.
 *
 * To add photos: drop cleared images in `web/public/library/` and register
 * them here with the topics they illustrate.
 */

type Entry = { re: RegExp; path: string; caption: string };

const LIBRARY: Entry[] = [
  {
    re: /cholera|health|hospital|clinic|medical|water|outbreak|vaccin/i,
    path: "/library/health-water.jpg",
    caption: "Water and health projects — Ethar Relief",
  },
  {
    re: /famine|food|nutrition|malnutrition|hunger|agricultur/i,
    path: "/library/food-children.jpg",
    caption: "Children supported by Ethar Relief",
  },
  {
    re: /displac|refugee|camp|fleeing|fled/i,
    path: "/library/displacement-team.jpg",
    caption: "Ethar Relief teams on the ground",
  },
];

const DEFAULT_ENTRY = {
  path: "/library/default.jpg",
  caption: "Ethar Relief in the field",
  library: true as const,
};

export type LibraryImage = { path: string; caption: string; credit: string; library: true };

export function libraryImagery(event: EventRow, bodyText: string): LibraryImage | null {
  const hay = `${event.headline} ${event.location_label ?? ""} ${bodyText}`;
  const hit = LIBRARY.find((l) => l.re.test(hay));
  if (!hit) return { ...DEFAULT_ENTRY, credit: "Ethar Relief" };
  return { path: hit.path, caption: hit.caption, credit: "Ethar Relief", library: true as const };
}
