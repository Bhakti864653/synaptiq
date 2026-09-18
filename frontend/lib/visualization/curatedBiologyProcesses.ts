// A small curated set of well-known, ordered biological process stages.
// Used only to ORDER a material's own real concepts when 2+ of them
// happen to name a recognized stage of the same known process - never to
// invent a stage that isn't already one of the user's real concepts.
export type BiologyProcess = {
  name: string;
  stages: string[]; // canonical order, lowercase match keys
};

export const CURATED_BIOLOGY_PROCESSES: BiologyProcess[] = [
  {
    name: "Cellular respiration",
    stages: [
      "glycolysis",
      "pyruvate oxidation",
      "krebs cycle",
      "citric acid cycle",
      "electron transport chain",
      "electron transport",
      "oxidative phosphorylation",
    ],
  },
  {
    name: "Photosynthesis",
    stages: ["light reaction", "light-dependent reaction", "calvin cycle", "light-independent reaction"],
  },
  {
    name: "Protein synthesis",
    stages: ["transcription", "mrna processing", "translation"],
  },
  {
    name: "Mitosis",
    stages: ["interphase", "prophase", "metaphase", "anaphase", "telophase", "cytokinesis"],
  },
];

function stageIndex(process: BiologyProcess, conceptText: string): number {
  const normalized = conceptText.toLowerCase();
  return process.stages.findIndex((stage) => normalized.includes(stage));
}

export type OrderedBiologyStage = { conceptIndex: number; stageOrder: number };

// Finds which known process (if any) at least 2 of the material's real
// concepts belong to, and returns those concepts in the process's real
// canonical order. Concepts that don't match any known stage are left out
// entirely rather than guessed at.
export function matchBiologyProcess(
  concepts: { name: string; summary?: string | null }[],
): { process: BiologyProcess; ordered: OrderedBiologyStage[] } | null {
  let best: { process: BiologyProcess; ordered: OrderedBiologyStage[] } | null = null;

  for (const process of CURATED_BIOLOGY_PROCESSES) {
    const matched: OrderedBiologyStage[] = [];
    concepts.forEach((concept, conceptIndex) => {
      const text = `${concept.name} ${concept.summary ?? ""}`;
      const idx = stageIndex(process, text);
      if (idx !== -1) matched.push({ conceptIndex, stageOrder: idx });
    });
    if (matched.length >= 2 && (!best || matched.length > best.ordered.length)) {
      matched.sort((a, b) => a.stageOrder - b.stageOrder);
      best = { process, ordered: matched };
    }
  }

  return best;
}
