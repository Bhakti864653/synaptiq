import { describe, expect, it } from "vitest";
import { recommendedStage } from "../learningJourney";

describe("recommendedStage", () => {
  it("recommends recall for a never-attempted concept, never claims a prior stage is done", () => {
    expect(recommendedStage(null)).toBe("recall");
  });

  it("recommends practice for a low, real score", () => {
    expect(recommendedStage(20)).toBe("practice");
  });

  it("recommends review for a passing-but-not-mastered score", () => {
    expect(recommendedStage(65)).toBe("review");
  });

  it("reports mastered rather than recommending a further stage once mastery is high", () => {
    expect(recommendedStage(90)).toBe("mastered");
  });
});
