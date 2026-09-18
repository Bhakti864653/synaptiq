import { detectSubjectDetailed, type VisualizationSubject } from "./detectSubject";
import { matchCuratedMolecule, type CuratedMolecule } from "./curatedMolecules";
import { extractEquation, type ExtractedEquation } from "./extractEquation";
import { matchBiologyProcess, type BiologyProcess, type OrderedBiologyStage } from "./curatedBiologyProcesses";
import { extractHistoryEvents, type HistoryEvent } from "./extractHistoryDates";
import { matchGeographyConcepts, type GeographyConceptMatch } from "./extractGeographyFeatures";

export type VisualizationMode =
  | "geography"
  | "chemistry-molecule"
  | "chemistry-concept"
  | "math-graph"
  | "math-concept"
  | "biology-process"
  | "biology-concept"
  | "literature-network"
  | "history-timeline"
  | "constellation";

export type ConceptInput = {
  id: string;
  name: string;
  summary?: string | null;
  excerpt?: string | null;
};

export type VisualizationSelection = {
  subject: VisualizationSubject;
  topic: string | null;
  mode: VisualizationMode;
  confidence: number;
  evidence: string[];
  // Mode-specific real evidence, attached only when relevant - never
  // populated with fabricated data.
  geography?: GeographyConceptMatch[];
  molecule?: CuratedMolecule;
  equation?: ExtractedEquation;
  biologyProcess?: { process: BiologyProcess; ordered: OrderedBiologyStage[] };
  historyEvents?: HistoryEvent[];
};

// A subject match below this confidence is too weak to act on - falls
// back to the constellation rather than committing to a specialized mode
// on a guess. (Evidence-backed modes - a recognized molecule, a parsed
// equation, a matched process, real dates - bypass this entirely, since
// those are verified facts about the material's own text, not a keyword
// guess.)
const MIN_SUBJECT_CONFIDENCE = 0.34;

// The full pipeline: subject detection -> topic/evidence extraction ->
// final mode selection. Deliberately pure and synchronous - no network or
// AI calls, so this is safe to run on every render.
export function selectVisualization({
  filename,
  concepts,
}: {
  filename: string;
  concepts: ConceptInput[];
}): VisualizationSelection {
  const allText = [filename, ...concepts.flatMap((c) => [c.name, c.summary ?? "", c.excerpt ?? ""])];
  const subjectDetection = detectSubjectDetailed(allText);
  const { subject, confidence, evidence } = subjectDetection;

  // Chemistry: a recognized molecule is real, verified evidence - checked
  // regardless of the keyword-based subject guess, since a material might
  // just say "water" without ever saying the word "chemistry".
  for (const concept of concepts) {
    const molecule = matchCuratedMolecule(`${concept.name} ${concept.summary ?? ""}`);
    if (molecule) {
      return {
        subject: "chemistry",
        topic: molecule.name,
        mode: "chemistry-molecule",
        confidence: 1,
        evidence: [concept.name],
        molecule,
      };
    }
  }

  // Mathematics: a real, safely-parsed equation is likewise checked
  // independent of the keyword guess.
  const equationText = concepts.map((c) => `${c.name} ${c.summary ?? ""} ${c.excerpt ?? ""}`).join(" ");
  const equation = extractEquation(equationText);
  if (equation) {
    return {
      subject: "mathematics",
      topic: equation.displayText,
      mode: "math-graph",
      confidence: 1,
      evidence: [equation.displayText],
      equation,
    };
  }

  // Biology: a real match against a known, ordered process.
  const biologyMatch = matchBiologyProcess(concepts);
  if (biologyMatch) {
    return {
      subject: "biology",
      topic: biologyMatch.process.name,
      mode: "biology-process",
      confidence: 1,
      evidence: biologyMatch.ordered.map((o) => concepts[o.conceptIndex].name),
      biologyProcess: biologyMatch,
    };
  }

  // History: real years actually present in the material's own text.
  const historyEvents = extractHistoryEvents(concepts);
  if (historyEvents.length >= 2) {
    return {
      subject: "history",
      topic: "Timeline",
      mode: "history-timeline",
      confidence: 1,
      evidence: historyEvents.map((e) => `${e.label} (${e.year})`),
      historyEvents,
    };
  }

  if (confidence < MIN_SUBJECT_CONFIDENCE) {
    return { subject: "general", topic: null, mode: "constellation", confidence, evidence };
  }

  if (subject === "geography") {
    const geography = matchGeographyConcepts(concepts);
    return { subject, topic: null, mode: "geography", confidence, evidence, geography };
  }
  if (subject === "chemistry") {
    return { subject, topic: null, mode: "chemistry-concept", confidence, evidence };
  }
  if (subject === "mathematics") {
    return { subject, topic: null, mode: "math-concept", confidence, evidence };
  }
  if (subject === "biology") {
    return { subject, topic: null, mode: "biology-concept", confidence, evidence };
  }
  if (subject === "literature" && concepts.length >= 2) {
    return { subject, topic: null, mode: "literature-network", confidence, evidence };
  }

  return { subject, topic: null, mode: "constellation", confidence, evidence };
}
