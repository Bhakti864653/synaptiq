import { detectSubjectForMaterial } from "@/lib/visualization/detectSubject";
import { buildConstellationData } from "@/lib/visualization/buildConstellationData";
import KnowledgeConstellation from "../KnowledgeConstellation";
import GeographyGlobe from "../modes/GeographyGlobe";
import ChemistryMolecule from "../modes/ChemistryMolecule";
import MathSurface from "../modes/MathSurface";

// The subject-aware visualization router. Data selection (which subject,
// which real concepts/mastery feed it) is fully separate from rendering
// (each mode is its own component) - adding a new mode later only ever
// means adding one more branch here plus one new mode component, never
// touching the ones that already exist.
//
// Biology/History/Literature don't yet have a bespoke rendering mode of
// their own - they intentionally share the knowledge-constellation
// fallback rather than a half-accurate specialized visualization, exactly
// per the "don't claim a perfect model for every topic" instruction. Only
// geography, chemistry, and mathematics have a distinct specialized scene
// so far; the architecture below makes adding the rest additive, not a
// rewrite.
export default function TopicVisualization({
  documentId,
  filename,
  concepts,
  masteryByConceptId,
}: {
  documentId: string;
  filename: string;
  concepts: { id: string; name: string }[];
  masteryByConceptId: Map<string, number>;
}) {
  const conceptNames = concepts.map((c) => c.name);
  const subject = detectSubjectForMaterial({ filename, conceptNames });

  if (subject === "geography") {
    return <GeographyGlobe conceptNames={conceptNames} />;
  }
  if (subject === "chemistry") {
    return <ChemistryMolecule conceptNames={conceptNames} />;
  }
  if (subject === "mathematics") {
    const scored = concepts
      .map((c) => masteryByConceptId.get(c.id))
      .filter((score): score is number => typeof score === "number");
    const overallMastery = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length)
      : null;
    return <MathSurface overallMastery={overallMastery} />;
  }

  // general / biology / history / literature
  const data = buildConstellationData({
    concepts: concepts.map((c) => ({ id: c.id, name: c.name, document_id: documentId })),
    documents: [{ id: documentId, filename }],
    masteryByConceptId,
  });
  return (
    <KnowledgeConstellation
      data={data}
      title="Topic visualization"
      emptyHint="Concepts for this material will appear here once it's set up."
    />
  );
}
