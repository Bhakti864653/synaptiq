import { describe, expect, it } from "vitest";
import { buildProcessFlowData } from "../buildProcessFlowData";

describe("buildProcessFlowData", () => {
  it("chains real concepts strictly in the given order, never reordering or fabricating stages", () => {
    const data = buildProcessFlowData({
      documentId: "doc-1",
      documentLabel: "Cell Biology.pdf",
      orderedConcepts: [
        { id: "c1", name: "Glycolysis" },
        { id: "c2", name: "Krebs Cycle" },
        { id: "c3", name: "Electron Transport Chain" },
      ],
      masteryByConceptId: new Map([["c1", 80]]),
    });

    expect(data.nodes.map((n) => n.label)).toEqual([
      "Glycolysis",
      "Krebs Cycle",
      "Electron Transport Chain",
    ]);
    expect(data.edges).toEqual([
      { source: "c1", target: "c2" },
      { source: "c2", target: "c3" },
    ]);
    expect(data.nodes.find((n) => n.id === "c1")?.mastery).toBe(80);
    expect(data.nodes.find((n) => n.id === "c2")?.mastery).toBeNull();
  });

  it("never throws and produces finite positions for a single-stage input", () => {
    const data = buildProcessFlowData({
      documentId: "doc-1",
      documentLabel: "x",
      orderedConcepts: [{ id: "c1", name: "Only Stage" }],
      masteryByConceptId: new Map(),
    });
    expect(data.nodes[0].position.every((n) => Number.isFinite(n))).toBe(true);
    expect(data.edges).toEqual([]);
  });
});
