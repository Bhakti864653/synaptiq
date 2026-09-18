// Keyword-based subject detection - deliberately not an attempt to
// classify arbitrary topics perfectly. There is no subject/topic column
// on `documents` or `concepts` (checked the live schema before writing
// this), so this works from the material's filename plus its concept
// names/summaries, which is the only real signal available. Anything that
// doesn't clearly match a known subject's keyword set falls through to
// "general" - the elegant constellation fallback - rather than guessing.
export type VisualizationSubject =
  | "geography"
  | "biology"
  | "chemistry"
  | "mathematics"
  | "history"
  | "literature"
  | "general";

const KEYWORDS: Record<Exclude<VisualizationSubject, "general">, string[]> = {
  geography: [
    "geography",
    "continent",
    "ocean",
    "mountain",
    "climate",
    "terrain",
    "elevation",
    "map",
    "tectonic",
    "river",
    "capital",
    "country",
    "population density",
  ],
  biology: [
    "biology",
    "cell",
    "mitochondria",
    "photosynthesis",
    "dna",
    "gene",
    "organism",
    "enzyme",
    "ecosystem",
    "evolution",
    "anatomy",
    "protein",
  ],
  chemistry: [
    "chemistry",
    "molecule",
    "reaction",
    "bond",
    "compound",
    "acid",
    "base",
    "element",
    "periodic table",
    "stoichiometry",
    "catalyst",
  ],
  mathematics: [
    "math",
    "calculus",
    "algebra",
    "geometry",
    "derivative",
    "integral",
    "equation",
    "matrix",
    "vector",
    "theorem",
    "probability",
    "statistics",
  ],
  history: [
    "history",
    "war",
    "revolution",
    "empire",
    "century",
    "dynasty",
    "treaty",
    "colonial",
    "ancient",
    "civilization",
  ],
  literature: [
    "literature",
    "novel",
    "poem",
    "poetry",
    "protagonist",
    "narrative",
    "symbolism",
    "metaphor",
    "playwright",
    "stanza",
  ],
};

const SUBJECT_PRIORITY: Exclude<VisualizationSubject, "general">[] = [
  "chemistry",
  "biology",
  "geography",
  "mathematics",
  "history",
  "literature",
];

export type SubjectDetection = {
  subject: VisualizationSubject;
  confidence: number; // 0-1, roughly "how many distinct keywords matched"
  evidence: string[];
};

export function detectSubjectDetailed(text: string[]): SubjectDetection {
  const haystack = text.join(" ").toLowerCase();
  if (!haystack.trim()) return { subject: "general", confidence: 0, evidence: [] };

  let best: SubjectDetection = { subject: "general", confidence: 0, evidence: [] };

  for (const subject of SUBJECT_PRIORITY) {
    const evidence = KEYWORDS[subject].filter((keyword) => haystack.includes(keyword));
    if (evidence.length > best.evidence.length) {
      best = { subject, confidence: Math.min(1, evidence.length / 3), evidence };
    }
  }

  return best;
}

export function detectSubject(text: string[]): VisualizationSubject {
  return detectSubjectDetailed(text).subject;
}

export function detectSubjectForMaterial({
  filename,
  conceptNames,
}: {
  filename: string;
  conceptNames: string[];
}): VisualizationSubject {
  return detectSubject([filename, ...conceptNames]);
}
