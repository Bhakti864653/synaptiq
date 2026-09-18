import type { ConstellationData } from "./buildConstellationData";
import { colorForMastery } from "./buildConstellationData";

// A linear-arc arrangement (not the fibonacci-sphere cluster
// buildConstellationData uses) for stages that have a genuine real
// sequence, e.g. glycolysis -> Krebs cycle -> electron transport - the
// shape itself communicates "flow," and edges are a strict chain in that
// real order, never a generic cloud of connections.
export function buildProcessFlowData({
  documentId,
  documentLabel,
  orderedConcepts,
  masteryByConceptId,
}: {
  documentId: string;
  documentLabel: string;
  orderedConcepts: { id: string; name: string }[];
  masteryByConceptId: Map<string, number>;
}): ConstellationData {
  const count = orderedConcepts.length;
  const nodes = orderedConcepts.map((concept, i) => {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    const angle = (t - 0.5) * Math.PI * 0.9; // gentle arc, not a full circle
    const mastery = masteryByConceptId.get(concept.id) ?? null;
    return {
      id: concept.id,
      label: concept.name,
      documentId,
      documentLabel,
      mastery,
      position: [Math.sin(angle) * 5, -Math.cos(angle) * 2 + 1, Math.cos(angle) * 1.5] as [
        number,
        number,
        number,
      ],
      color: colorForMastery(mastery),
    };
  });

  const edges = nodes.slice(1).map((node, i) => ({ source: nodes[i].id, target: node.id }));

  return { nodes, edges };
}
