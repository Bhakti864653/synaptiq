import { describe, expect, it } from "vitest";
import { computeCurrentStreak } from "../streak";

const today = new Date("2026-09-17T12:00:00Z");

describe("computeCurrentStreak", () => {
  it("returns 0 when there are no sessions at all", () => {
    expect(computeCurrentStreak([], today)).toBe(0);
  });

  it("counts today and consecutive prior days", () => {
    expect(computeCurrentStreak(["2026-09-17", "2026-09-16", "2026-09-15"], today)).toBe(3);
  });

  it("still counts as current if only yesterday (not today) was studied", () => {
    expect(computeCurrentStreak(["2026-09-16", "2026-09-15"], today)).toBe(2);
  });

  it("breaks the streak once a full day is skipped", () => {
    expect(computeCurrentStreak(["2026-09-17", "2026-09-15"], today)).toBe(1);
  });

  it("ignores session dates far in the past that aren't part of the current run", () => {
    expect(computeCurrentStreak(["2026-09-17", "2026-01-01"], today)).toBe(1);
  });
});
