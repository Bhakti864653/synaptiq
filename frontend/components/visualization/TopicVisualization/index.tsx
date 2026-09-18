import { selectVisualizationForFocus } from "@/lib/visualization/selectVisualizationForFocus";
import type { ConceptInput } from "@/lib/visualization/selectVisualization";
import { buildConstellationData } from "@/lib/visualization/buildConstellationData";
import { buildProcessFlowData } from "@/lib/visualization/buildProcessFlowData";
import KnowledgeConstellation from "../KnowledgeConstellation";
import GeographyGlobe from "../modes/GeographyGlobe";
import ChemistryMolecule from "../modes/ChemistryMolecule";
import MathSurface from "../modes/MathSurface";
import HistoryTimeline from "../modes/HistoryTimeline";

// The subject-aware visualization router. Data selection
// (lib/visualization/selectVisualizationForFocus.ts - subject, topic,
// evidence, confidence, and which concept the current mode should
// highlight) is fully separate from rendering (each mode below is its
// own component) - adding a new mode later only ever means one more
// branch here plus one new mode component, never touching the ones that
// already exist.
//
// `selectedConceptId` is what makes this reactive to the workspace's
// concept rail: the same mode/component type stays mounted whenever
// possible (React only remounts a component when its type or key
// changes), so switching which concept is highlighted inside an already-
// showing scene never recreates the WebGL canvas - only a genuine mode
// change (e.g. the selected concept is itself a different recognized
// molecule) does that, which is the correct, unavoidable case for it.
//
// Every branch here is backed by real evidence attached to the selection
// result (a curated molecule, a safely-parsed equation, a matched process,
// real dates, verified locations) - nothing renders from an invented fact.
// "-concept" modes (chemistry/math/biology without specific evidence) and
// low-confidence/general/literature-with-too-few-concepts all share the
// same honest constellation fallback.
export default function TopicVisualization({
  documentId,
  filename,
  concepts,
  masteryByConceptId,
  selectedConceptId,
}: {
  documentId: string;
  filename: string;
  concepts: ConceptInput[];
  masteryByConceptId: Map<string, number>;
  selectedConceptId: string;
}) {
  const selection = selectVisualizationForFocus({ filename, concepts, selectedConceptId });

  if (selection.mode === "geography" && selection.geography) {
    return <GeographyGlobe matches={selection.geography} focusedFeatureName={selection.focusedLabel} />;
  }

  if (selection.mode === "chemistry-molecule" && selection.molecule) {
    return <ChemistryMolecule molecule={selection.molecule} />;
  }

  if (selection.mode === "math-graph" && selection.equation) {
    const scored = concepts
      .map((c) => masteryByConceptId.get(c.id))
      .filter((score): score is number => typeof score === "number");
    const overallMastery = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length)
      : null;
    return <MathSurface equation={selection.equation} overallMastery={overallMastery} />;
  }

  if (selection.mode === "history-timeline" && selection.historyEvents) {
    const focusedIndex = selection.focusedConceptId
      ? concepts.findIndex((c) => c.id === selection.focusedConceptId)
      : null;
    return <HistoryTimeline events={selection.historyEvents} focusedConceptIndex={focusedIndex} />;
  }

  if (selection.mode === "biology-process" && selection.biologyProcess) {
    const orderedConcepts = selection.biologyProcess.ordered.map((o) => concepts[o.conceptIndex]);
    const data = buildProcessFlowData({
      documentId,
      documentLabel: filename,
      orderedConcepts,
      masteryByConceptId,
    });
    return (
      <KnowledgeConstellation
        data={data}
        title={`${selection.biologyProcess.process.name} - process flow`}
        emptyHint="Concepts for this process will appear here once available."
        activeLabel={selection.focusedConceptId ? selection.focusedLabel : null}
        focusedConceptId={selection.focusedConceptId}
      />
    );
  }

  if (selection.mode === "literature-network") {
    const data = buildConstellationData({
      concepts: concepts.map((c) => ({ id: c.id, name: c.name, document_id: documentId })),
      documents: [{ id: documentId, filename }],
      masteryByConceptId,
    });
    return (
      <KnowledgeConstellation
        data={data}
        title="Character & theme network"
        emptyHint="Concepts for this material will appear here once it's set up."
        activeLabel={selection.focusedLabel}
        focusedConceptId={selection.focusedConceptId}
      />
    );
  }

  // constellation / chemistry-concept / math-concept / biology-concept /
  // general - the shared, honest fallback. Framing the title by subject
  // where we have one, without claiming a specialized model we don't have.
  const data = buildConstellationData({
    concepts: concepts.map((c) => ({ id: c.id, name: c.name, document_id: documentId })),
    documents: [{ id: documentId, filename }],
    masteryByConceptId,
  });
  const conceptTitle =
    selection.mode === "chemistry-concept"
      ? "Chemistry concepts"
      : selection.mode === "math-concept"
        ? "Math concepts"
        : selection.mode === "biology-concept"
          ? "Biology concepts"
          : "Topic visualization";
  return (
    <KnowledgeConstellation
      data={data}
      title={conceptTitle}
      emptyHint="Concepts for this material will appear here once it's set up."
      activeLabel={selection.focusedLabel}
      focusedConceptId={selection.focusedConceptId}
    />
  );
}
