import { selectVisualization, type ConceptInput, type VisualizationSelection } from "./selectVisualization";
import { matchCuratedMolecule } from "./curatedMolecules";
import { extractEquation } from "./extractEquation";
import { matchCuratedGeographyFeature } from "./curatedGeography";

export type FocusedVisualization = VisualizationSelection & {
  // Which concept (if any) the current mode should visually highlight -
  // the marker/node/graph this specific concept maps onto. null means
  // "this concept has no addressable spot in the current scene" (still
  // shown honestly via the constellation's own highlight instead).
  focusedConceptId: string | null;
  // A short, real label describing what's currently highlighted - shown
  // next to the visualization title so "the active visualization label
  // updates" is genuinely true, not just implied.
  focusedLabel: string | null;
};

// Two-layer decision: first check whether the SELECTED concept alone is
// specific enough to override the whole-material mode (a material about
// "world geography" that happens to also name a real molecule in one
// concept should still show that molecule when that concept is selected -
// this is what makes "selecting a recognized molecule displays that
// molecule" true even outside a chemistry-flavored material). If not,
// fall back to the material-level mode and compute where (if anywhere)
// the selected concept fits inside it.
export function selectVisualizationForFocus({
  filename,
  concepts,
  selectedConceptId,
}: {
  filename: string;
  concepts: ConceptInput[];
  selectedConceptId: string;
}): FocusedVisualization {
  const materialSelection = selectVisualization({ filename, concepts });
  const selected = concepts.find((c) => c.id === selectedConceptId);
  if (!selected) {
    return { ...materialSelection, focusedConceptId: null, focusedLabel: null };
  }
  const selectedText = `${selected.name} ${selected.summary ?? ""} ${selected.excerpt ?? ""}`;

  const molecule = matchCuratedMolecule(selectedText);
  if (molecule) {
    return {
      subject: "chemistry",
      topic: molecule.name,
      mode: "chemistry-molecule",
      confidence: 1,
      evidence: [selected.name],
      molecule,
      focusedConceptId: selected.id,
      focusedLabel: molecule.name,
    };
  }

  const equation = extractEquation(selectedText);
  if (equation) {
    return {
      subject: "mathematics",
      topic: equation.displayText,
      mode: "math-graph",
      confidence: 1,
      evidence: [equation.displayText],
      equation,
      focusedConceptId: selected.id,
      focusedLabel: equation.displayText,
    };
  }

  if (materialSelection.mode === "geography") {
    const feature = matchCuratedGeographyFeature(selected.name);
    return {
      ...materialSelection,
      focusedConceptId: selected.id,
      focusedLabel: feature?.name ?? selected.name,
    };
  }

  if (materialSelection.mode === "biology-process" && materialSelection.biologyProcess) {
    const inProcess = materialSelection.biologyProcess.ordered.some(
      (o) => concepts[o.conceptIndex]?.id === selected.id,
    );
    return {
      ...materialSelection,
      focusedConceptId: inProcess ? selected.id : null,
      focusedLabel: selected.name,
    };
  }

  // math-graph/chemistry-molecule/history-timeline/literature-network at
  // the whole-material level, or the constellation fallback - the
  // selected concept is simply the thing to highlight.
  return { ...materialSelection, focusedConceptId: selected.id, focusedLabel: selected.name };
}
