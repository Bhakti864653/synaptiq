import { describe, expect, it } from "vitest";
import { journeyStageStatus } from "../learningJourney";

describe("journeyStageStatus", () => {
  it("a never-attempted concept: read is current, everything else upcoming", () => {
    expect(journeyStageStatus("read", null)).toBe("current");
    expect(journeyStageStatus("recall", null)).toBe("upcoming");
    expect(journeyStageStatus("practice", null)).toBe("upcoming");
    expect(journeyStageStatus("review", null)).toBe("upcoming");
  });

  it("a low, real score (attempted but not yet passing): recall is current", () => {
    expect(journeyStageStatus("read", 20)).toBe("done");
    expect(journeyStageStatus("recall", 20)).toBe("current");
    expect(journeyStageStatus("practice", 20)).toBe("upcoming");
  });

  it("a passing-but-not-mastered score: practice is current", () => {
    expect(journeyStageStatus("recall", 65)).toBe("done");
    expect(journeyStageStatus("practice", 65)).toBe("current");
    expect(journeyStageStatus("review", 65)).toBe("upcoming");
  });

  it("a mastered score: every stage including review reads done, never stuck at 'current' forever", () => {
    expect(journeyStageStatus("read", 90)).toBe("done");
    expect(journeyStageStatus("recall", 90)).toBe("done");
    expect(journeyStageStatus("practice", 90)).toBe("done");
    expect(journeyStageStatus("review", 90)).toBe("done");
  });
});
