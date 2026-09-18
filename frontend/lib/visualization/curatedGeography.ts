// A small, hand-curated set of real, internationally recognized geographic
// features with genuine approximate coordinates - continents, oceans, and
// major mountain ranges/peaks only. This is deliberately NOT exhaustive:
// the whole point is that a concept only ever gets a marker when it
// matches one of these known, verified entries. Everything else stays in
// the plain concept list rather than being placed at a made-up location.
export type GeographyFeature = {
  name: string;
  kind: "continent" | "ocean" | "mountain-range" | "peak";
  lat: number;
  lon: number;
  aliases: string[];
};

export const CURATED_GEOGRAPHY_FEATURES: GeographyFeature[] = [
  { name: "Pacific Ocean", kind: "ocean", lat: 0, lon: -160, aliases: ["pacific ocean", "pacific"] },
  { name: "Atlantic Ocean", kind: "ocean", lat: 10, lon: -40, aliases: ["atlantic ocean", "atlantic"] },
  { name: "Indian Ocean", kind: "ocean", lat: -20, lon: 75, aliases: ["indian ocean"] },
  { name: "Arctic Ocean", kind: "ocean", lat: 85, lon: 0, aliases: ["arctic ocean"] },
  { name: "Southern Ocean", kind: "ocean", lat: -65, lon: 0, aliases: ["southern ocean", "antarctic ocean"] },

  { name: "Africa", kind: "continent", lat: 2, lon: 20, aliases: ["africa"] },
  { name: "Asia", kind: "continent", lat: 45, lon: 90, aliases: ["asia"] },
  { name: "Europe", kind: "continent", lat: 50, lon: 15, aliases: ["europe"] },
  { name: "North America", kind: "continent", lat: 45, lon: -100, aliases: ["north america"] },
  { name: "South America", kind: "continent", lat: -15, lon: -60, aliases: ["south america"] },
  { name: "Antarctica", kind: "continent", lat: -80, lon: 0, aliases: ["antarctica"] },
  { name: "Australia", kind: "continent", lat: -25, lon: 135, aliases: ["australia"] },

  { name: "Himalayas", kind: "mountain-range", lat: 28, lon: 84, aliases: ["himalayas", "himalaya"] },
  { name: "Andes", kind: "mountain-range", lat: -22, lon: -68, aliases: ["andes"] },
  { name: "Rocky Mountains", kind: "mountain-range", lat: 44, lon: -110, aliases: ["rocky mountains", "the rockies", "rockies"] },
  { name: "Alps", kind: "mountain-range", lat: 46.5, lon: 10, aliases: ["alps", "the alps"] },
  { name: "Ural Mountains", kind: "mountain-range", lat: 60, lon: 59.5, aliases: ["ural mountains", "urals"] },
  { name: "Atlas Mountains", kind: "mountain-range", lat: 31.5, lon: -6, aliases: ["atlas mountains"] },
  { name: "Appalachian Mountains", kind: "mountain-range", lat: 38, lon: -80, aliases: ["appalachian mountains", "appalachians"] },

  { name: "Mount Everest", kind: "peak", lat: 27.99, lon: 86.92, aliases: ["mount everest", "mt everest", "everest"] },
  { name: "Mount Kilimanjaro", kind: "peak", lat: -3.07, lon: 37.35, aliases: ["mount kilimanjaro", "kilimanjaro"] },
  { name: "Mont Blanc", kind: "peak", lat: 45.83, lon: 6.86, aliases: ["mont blanc"] },
];

// Matches real concept text against the curated list. Only an exact
// alias match counts - no fuzzy/partial matching, since a near-miss here
// would mean showing a marker for the wrong real place, which is worse
// than showing no marker at all.
export function matchCuratedGeographyFeature(text: string): GeographyFeature | null {
  const normalized = text.toLowerCase().trim();
  for (const feature of CURATED_GEOGRAPHY_FEATURES) {
    if (feature.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return feature;
    }
  }
  return null;
}
