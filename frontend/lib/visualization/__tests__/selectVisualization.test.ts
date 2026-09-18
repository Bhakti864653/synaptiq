import { describe, expect, it } from "vitest";
import { selectVisualization } from "../selectVisualization";

describe("selectVisualization", () => {
  it("1. geography material about mountains and oceans without named locations -> conceptual geography mode, no fake coordinates", () => {
    const result = selectVisualization({
      filename: "World Geography Ch. 4.pdf",
      concepts: [
        { id: "c1", name: "Mountain Formation" },
        { id: "c2", name: "Ocean Currents" },
        { id: "c3", name: "Tectonic Plates" },
      ],
    });
    expect(result.mode).toBe("geography");
    expect(result.subject).toBe("geography");
    // No concept here matches a curated, verified feature - every entry
    // must come back with feature: null, never an invented coordinate.
    expect(result.geography?.every((g) => g.feature === null)).toBe(true);
  });

  it("2. geography material containing a real named location -> the curated, verified feature is attached", () => {
    const result = selectVisualization({
      filename: "World Geography Ch. 4.pdf",
      concepts: [
        { id: "c1", name: "The Himalayas" },
        { id: "c2", name: "Local river erosion" },
      ],
    });
    expect(result.mode).toBe("geography");
    const himalayas = result.geography?.find((g) => g.label === "The Himalayas");
    expect(himalayas?.feature?.name).toBe("Himalayas");
    // The unmatched concept must stay in the list with no fabricated
    // location, not be dropped or placed somewhere arbitrary.
    const river = result.geography?.find((g) => g.label === "Local river erosion");
    expect(river?.feature).toBeNull();
  });

  it("3. cellular respiration -> a real biology process mode using the material's own concept names, in the correct real order", () => {
    const result = selectVisualization({
      filename: "Cell Biology Notes.pdf",
      concepts: [
        { id: "c1", name: "Electron Transport Chain" },
        { id: "c2", name: "Glycolysis" },
        { id: "c3", name: "Krebs Cycle" },
      ],
    });
    expect(result.mode).toBe("biology-process");
    expect(result.biologyProcess?.process.name).toBe("Cellular respiration");
    // Real concepts only, in the true biological order - glycolysis first
    // even though it wasn't listed first in the input.
    expect(result.evidence).toEqual(["Glycolysis", "Krebs Cycle", "Electron Transport Chain"]);
  });

  it("4. a named chemical molecule -> the curated, chemically accurate structure, not an atom count", () => {
    const result = selectVisualization({
      filename: "Intro Chemistry.pdf",
      concepts: [
        { id: "c1", name: "Water" },
        { id: "c2", name: "Molecular Bonds" },
        { id: "c3", name: "Reaction Rates" },
        { id: "c4", name: "Acids and Bases" },
      ],
    });
    expect(result.mode).toBe("chemistry-molecule");
    expect(result.molecule?.formula).toBe("H₂O");
    // 3 atoms (1 O + 2 H) regardless of there being 4 real concepts -
    // proves this isn't derived from concept count.
    expect(result.molecule?.atoms).toHaveLength(3);
  });

  it("5. algebra containing an actual equation -> the real, safely-parsed equation, not a decorative wave", () => {
    const result = selectVisualization({
      filename: "Algebra Basics.pdf",
      concepts: [
        { id: "c1", name: "Quadratic functions", summary: "For example, y = x^2 - 3*x + 2 is a parabola." },
      ],
    });
    expect(result.mode).toBe("math-graph");
    expect(result.equation?.displayText).toBe("y = x^2 - 3*x + 2");
    expect(result.equation?.parsed.usesY).toBe(false);
  });

  it("6. literature with characters and themes -> a network of the material's own real concept names", () => {
    const result = selectVisualization({
      filename: "Novel Study.pdf",
      concepts: [
        { id: "c1", name: "Protagonist's Journey" },
        { id: "c2", name: "Theme of Isolation" },
        { id: "c3", name: "Symbolism of the River" },
      ],
    });
    expect(result.mode).toBe("literature-network");
    expect(result.subject).toBe("literature");
  });

  it("7. unknown/general content -> the constellation fallback", () => {
    const result = selectVisualization({
      filename: "Notes.txt",
      concepts: [{ id: "c1", name: "Chapter 1" }, { id: "c2", name: "Chapter 2" }],
    });
    expect(result.mode).toBe("constellation");
    expect(result.subject).toBe("general");
  });

  it("8. ambiguous content with only weak, scattered keyword hits -> falls back safely instead of guessing a specialized mode", () => {
    const result = selectVisualization({
      filename: "Mixed Notes.txt",
      // A single weak, generic keyword hit each for two different
      // subjects - not enough real evidence to commit to either.
      concepts: [{ id: "c1", name: "A brief history of this map" }],
    });
    expect(result.mode).toBe("constellation");
    expect(result.confidence).toBeLessThan(0.34);
  });

  it("never selects chemistry-molecule/math-graph/biology-process without real, verifiable evidence attached", () => {
    const result = selectVisualization({
      filename: "General Chemistry.pdf",
      concepts: [{ id: "c1", name: "Chemical bonds" }, { id: "c2", name: "Reaction rates" }],
    });
    // Real chemistry keywords, but no recognized molecule - must fall to
    // the honest "chemistry-concept" mode, not fabricate a molecule.
    expect(result.mode).toBe("chemistry-concept");
    expect(result.molecule).toBeUndefined();
  });

  it("falls back to constellation for history subject text with fewer than 2 real dates", () => {
    const result = selectVisualization({
      filename: "History of Rome.pdf",
      concepts: [{ id: "c1", name: "The fall of an empire", summary: "This was a war." }],
    });
    expect(result.mode).toBe("constellation");
  });

  it("builds a real timeline from at least 2 real years actually present in the material", () => {
    const result = selectVisualization({
      filename: "20th Century History.pdf",
      concepts: [
        { id: "c1", name: "World War I", summary: "Began in 1914." },
        { id: "c2", name: "World War II", summary: "Began in 1939." },
      ],
    });
    expect(result.mode).toBe("history-timeline");
    expect(result.historyEvents?.map((e) => e.year)).toEqual([1914, 1939]);
  });
});
