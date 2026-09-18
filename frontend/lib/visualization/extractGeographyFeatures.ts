import { CURATED_GEOGRAPHY_FEATURES, matchCuratedGeographyFeature, type GeographyFeature } from "./curatedGeography";

export type GeographyConceptMatch = {
  conceptIndex: number;
  label: string;
  feature: GeographyFeature | null; // null = real concept, no verified location
};

// Checks every real concept against the curated, verified feature list.
// A concept that doesn't match anything stays with `feature: null` - it is
// never assigned a made-up coordinate, just kept around so the caller can
// still list it in the accompanying text list.
export function matchGeographyConcepts(
  concepts: { name: string }[],
): GeographyConceptMatch[] {
  return concepts.map((concept, conceptIndex) => ({
    conceptIndex,
    label: concept.name,
    feature: matchCuratedGeographyFeature(concept.name),
  }));
}

export { CURATED_GEOGRAPHY_FEATURES };
