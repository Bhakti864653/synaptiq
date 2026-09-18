import { describe, expect, it } from "vitest";
import { selectVisualizationForFocus } from "../selectVisualizationForFocus";

describe("selectVisualizationForFocus", () => {
  it("highlights the verified feature when the selected concept is a real named location", () => {
    const result = selectVisualizationForFocus({
      filename: "World Geography.pdf",
      concepts: [
        { id: "c1", name: "Mountain formation" },
        { id: "c2", name: "Pacific Ocean characteristics" },
      ],
      selectedConceptId: "c2",
    });
    expect(result.mode).toBe("geography");
    expect(result.focusedConceptId).toBe("c2");
    expect(result.focusedLabel).toBe("Pacific Ocean");
  });

  it("emphasizes the matching stage when a biology-process concept is selected", () => {
    const result = selectVisualizationForFocus({
      filename: "Cell Biology.pdf",
      concepts: [
        { id: "c1", name: "Glycolysis" },
        { id: "c2", name: "Krebs Cycle" },
        { id: "c3", name: "Unrelated tangent" },
      ],
      selectedConceptId: "c2",
    });
    expect(result.mode).toBe("biology-process");
    expect(result.focusedConceptId).toBe("c2");
  });

  it("does not highlight a concept that isn't actually part of the recognized process", () => {
    const result = selectVisualizationForFocus({
      filename: "Cell Biology.pdf",
      concepts: [
        { id: "c1", name: "Glycolysis" },
        { id: "c2", name: "Krebs Cycle" },
        { id: "c3", name: "Unrelated tangent" },
      ],
      selectedConceptId: "c3",
    });
    expect(result.mode).toBe("biology-process");
    expect(result.focusedConceptId).toBeNull();
  });

  it("switches to displaying a recognized molecule when that specific concept is selected, even outside a chemistry-detected material", () => {
    const result = selectVisualizationForFocus({
      filename: "General Science Notes.pdf",
      concepts: [
        { id: "c1", name: "Scientific method" },
        { id: "c2", name: "Water" },
      ],
      selectedConceptId: "c2",
    });
    expect(result.mode).toBe("chemistry-molecule");
    expect(result.molecule?.formula).toBe("H₂O");
    expect(result.focusedConceptId).toBe("c2");
  });

  it("switches to a real graph when the selected concept contains a supported equation", () => {
    const result = selectVisualizationForFocus({
      filename: "General Science Notes.pdf",
      concepts: [
        { id: "c1", name: "Scientific method" },
        { id: "c2", name: "A key formula", summary: "y = 2*x + 1" },
      ],
      selectedConceptId: "c2",
    });
    expect(result.mode).toBe("math-graph");
    expect(result.equation?.displayText).toBe("y = 2*x + 1");
  });

  it("falls back to the honest constellation with the selected concept highlighted when nothing specific matches", () => {
    const result = selectVisualizationForFocus({
      filename: "Random Notes.txt",
      concepts: [{ id: "c1", name: "Thing One" }, { id: "c2", name: "Thing Two" }],
      selectedConceptId: "c2",
    });
    expect(result.mode).toBe("constellation");
    expect(result.focusedConceptId).toBe("c2");
    expect(result.focusedLabel).toBe("Thing Two");
  });
});
