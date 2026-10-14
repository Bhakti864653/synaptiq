import { describe, expect, it } from "vitest";
import { recommendedStage, recommendedStep } from "../learningJourney";

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

describe("recommendedStep", () => {
  it("starts with the Study guide when the quiz isn't set up yet", () => {
    expect(recommendedStep({ quizReady: false, mastery: null })).toBe("study-guide");
  });
  it("recommends the quiz before any real answers exist", () => {
    expect(recommendedStep({ quizReady: true, mastery: null })).toBe("quiz");
  });
  it("sends a weak score back to the Study guide", () => {
    expect(recommendedStep({ quizReady: true, mastery: 30 })).toBe("study-guide");
  });
  it("recommends practice for a middling score", () => {
    expect(recommendedStep({ quizReady: true, mastery: 65 })).toBe("practice");
  });
  it("recommends flashcards to keep a mastered concept fresh", () => {
    expect(recommendedStep({ quizReady: true, mastery: 90 })).toBe("flashcards");
  });
});
