// Pure data-selection layer for the knowledge constellation - deliberately
// separate from anything that touches three.js/@react-three so the layout
// and color logic can be unit-tested without a WebGL context, and so the
// rendering layer can be swapped (WebGL scene vs. the CSS/list fallback)
// without duplicating this logic.

export type ConstellationNode = {
  id: string;
  label: string;
  documentId: string;
  documentLabel: string;
  mastery: number | null;
  position: [number, number, number];
  color: string;
};

export type ConstellationEdge = { source: string; target: string };

export type ConstellationData = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
};

const AMBER = "#f2a63f";
const CORAL = "#ef6a4c";
const VIOLET = "#8b6bff";

// Amber/coral/violet, but not arbitrary - each hue also carries real
// meaning (confirmed via hover text and the list view, never color alone):
// strong mastery reads warm/settled (amber), developing mastery reads
// coral, and anything weak or never attempted gets the violet "synapse"
// color - the same one the logo uses for "needs a spark".
export function colorForMastery(mastery: number | null): string {
  if (mastery === null) return VIOLET;
  if (mastery >= 80) return AMBER;
  if (mastery >= 50) return CORAL;
  return VIOLET;
}

// Evenly distributes `count` points across a sphere of the given radius -
// deterministic (no randomness) so layout is stable across renders and
// snapshot-testable, and reasonably non-overlapping without running any
// actual force-directed simulation.
function fibonacciSpherePoint(index: number, count: number, radius: number): [number, number, number] {
  if (count <= 1) return [0, 0, radius];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (count - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = goldenAngle * index;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  return [x * radius, y * radius, z * radius];
}

export function buildConstellationData({
  concepts,
  documents,
  masteryByConceptId,
}: {
  concepts: { id: string; name: string; document_id: string }[];
  documents: { id: string; filename: string }[];
  masteryByConceptId: Map<string, number>;
}): ConstellationData {
  const documentLabelById = new Map(documents.map((d) => [d.id, d.filename]));

  const conceptsByDocument = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const list = conceptsByDocument.get(c.document_id) ?? [];
    list.push(c);
    conceptsByDocument.set(c.document_id, list);
  }
  const documentIds = Array.from(conceptsByDocument.keys());

  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  documentIds.forEach((documentId, docIndex) => {
    const clusterCenter = fibonacciSpherePoint(docIndex, documentIds.length, 6);
    const docConcepts = conceptsByDocument.get(documentId) ?? [];

    docConcepts.forEach((concept, conceptIndex) => {
      const localOffset = fibonacciSpherePoint(conceptIndex, docConcepts.length, 1.6);
      const mastery = masteryByConceptId.get(concept.id) ?? null;
      nodes.push({
        id: concept.id,
        label: concept.name,
        documentId,
        documentLabel: documentLabelById.get(documentId) ?? "Untitled material",
        mastery,
        position: [
          clusterCenter[0] + localOffset[0],
          clusterCenter[1] + localOffset[1],
          clusterCenter[2] + localOffset[2],
        ],
        color: colorForMastery(mastery),
      });

      // Chain consecutive concepts from the same real material into a
      // light connecting line - a real (if simple) structural relationship
      // ("these came from the same source"), not a meaningless random edge.
      if (conceptIndex > 0) {
        edges.push({ source: docConcepts[conceptIndex - 1].id, target: concept.id });
      }
    });
  });

  return { nodes, edges };
}
