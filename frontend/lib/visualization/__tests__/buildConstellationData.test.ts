import { describe, expect, it } from "vitest";
import { buildConstellationData, colorForMastery } from "../buildConstellationData";

describe("colorForMastery", () => {
  it("uses violet for null (never attempted) and low mastery", () => {
    expect(colorForMastery(null)).toBe("#8b6bff");
    expect(colorForMastery(10)).toBe("#8b6bff");
  });

  it("uses coral for developing mastery", () => {
    expect(colorForMastery(65)).toBe("#ef6a4c");
  });

  it("uses amber for strong mastery", () => {
    expect(colorForMastery(90)).toBe("#f2a63f");
  });
});

describe("buildConstellationData", () => {
  const documents = [
    { id: "doc-1", filename: "Cell Biology.pdf" },
    { id: "doc-2", filename: "World Geography.pdf" },
  ];
  const concepts = [
    { id: "c1", name: "Mitochondria", document_id: "doc-1" },
    { id: "c2", name: "Photosynthesis", document_id: "doc-1" },
    { id: "c3", name: "Plate Tectonics", document_id: "doc-2" },
  ];
  const masteryByConceptId = new Map([
    ["c1", 90],
    ["c2", 40],
  ]);

  it("produces exactly one node per real concept, never fabricated data", () => {
    const { nodes } = buildConstellationData({ concepts, documents, masteryByConceptId });
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.label).sort()).toEqual(
      ["Mitochondria", "Photosynthesis", "Plate Tectonics"].sort(),
    );
  });

  it("carries the real mastery score (or null when never attempted) onto each node", () => {
    const { nodes } = buildConstellationData({ concepts, documents, masteryByConceptId });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("c1")?.mastery).toBe(90);
    expect(byId.get("c2")?.mastery).toBe(40);
    expect(byId.get("c3")?.mastery).toBeNull();
  });

  it("attaches the real source document's filename to each node", () => {
    const { nodes } = buildConstellationData({ concepts, documents, masteryByConceptId });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("c1")?.documentLabel).toBe("Cell Biology.pdf");
    expect(byId.get("c3")?.documentLabel).toBe("World Geography.pdf");
  });

  it("only connects concepts that share the same real source document", () => {
    const { edges } = buildConstellationData({ concepts, documents, masteryByConceptId });
    expect(edges).toEqual([{ source: "c1", target: "c2" }]);
  });

  it("gives every node a finite, distinct 3D position", () => {
    const { nodes } = buildConstellationData({ concepts, documents, masteryByConceptId });
    for (const node of nodes) {
      expect(node.position.every((coord) => Number.isFinite(coord))).toBe(true);
    }
    const positions = nodes.map((n) => n.position.join(","));
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("returns empty nodes/edges for a user with no concepts yet, never placeholder data", () => {
    expect(buildConstellationData({ concepts: [], documents: [], masteryByConceptId: new Map() })).toEqual(
      { nodes: [], edges: [] },
    );
  });
});
