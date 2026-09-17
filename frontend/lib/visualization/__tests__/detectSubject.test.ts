import { describe, expect, it } from "vitest";
import { detectSubjectForMaterial } from "../detectSubject";

describe("detectSubjectForMaterial", () => {
  it("detects geography from mountains/oceans content, not biology", () => {
    expect(
      detectSubjectForMaterial({
        filename: "World Geography Ch. 4.pdf",
        conceptNames: ["Mountain Ranges", "Ocean Currents", "Tectonic Plates"],
      }),
    ).toBe("geography");
  });

  it("detects biology from a cellular respiration material", () => {
    expect(
      detectSubjectForMaterial({
        filename: "Cell Biology Notes.pdf",
        conceptNames: ["Mitochondria", "Photosynthesis", "Cell Membrane"],
      }),
    ).toBe("biology");
  });

  it("detects chemistry from reaction/molecule content", () => {
    expect(
      detectSubjectForMaterial({
        filename: "Intro Chemistry.pdf",
        conceptNames: ["Chemical Bonds", "Reaction Rates", "Molecules"],
      }),
    ).toBe("chemistry");
  });

  it("detects mathematics from calculus content", () => {
    expect(
      detectSubjectForMaterial({
        filename: "Calculus II.pdf",
        conceptNames: ["Derivatives", "Integrals", "Limits and equations"],
      }),
    ).toBe("mathematics");
  });

  it("falls back to general for unrecognized or ambiguous content, never guesses", () => {
    expect(
      detectSubjectForMaterial({
        filename: "Notes.txt",
        conceptNames: ["Chapter 1", "Chapter 2"],
      }),
    ).toBe("general");
  });

  it("falls back to general for empty input rather than throwing", () => {
    expect(detectSubjectForMaterial({ filename: "", conceptNames: [] })).toBe("general");
  });
});
