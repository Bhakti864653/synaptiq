import { describe, expect, it } from "vitest";
import { extractKeyIdea } from "../extractKeyIdea";

describe("extractKeyIdea", () => {
  it("returns the first real sentence of the summary when one exists", () => {
    expect(extractKeyIdea("Mitochondria produce ATP. They have two membranes.", null)).toBe(
      "Mitochondria produce ATP.",
    );
  });

  it("falls back to the excerpt when there is no summary", () => {
    expect(extractKeyIdea(null, "This is a real excerpt from the material. More text follows.")).toBe(
      "This is a real excerpt from the material.",
    );
  });

  it("returns null rather than a placeholder when neither exists", () => {
    expect(extractKeyIdea(null, null)).toBeNull();
    expect(extractKeyIdea("", "")).toBeNull();
  });

  it("truncates an overly long single-sentence source rather than showing an unbounded wall of text", () => {
    const long = "a".repeat(300);
    const result = extractKeyIdea(long, null);
    expect(result!.length).toBeLessThanOrEqual(220);
    expect(result!.endsWith("...")).toBe(true);
  });
});
