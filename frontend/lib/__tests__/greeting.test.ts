import { describe, expect, it } from "vitest";
import { greetingHeadline, motivationalLine, timeOfDayGreeting } from "../greeting";

describe("timeOfDayGreeting", () => {
  it("greets morning, afternoon, evening, and late-night correctly", () => {
    expect(timeOfDayGreeting(new Date("2026-01-01T08:00:00"))).toBe("Good morning");
    expect(timeOfDayGreeting(new Date("2026-01-01T14:00:00"))).toBe("Good afternoon");
    expect(timeOfDayGreeting(new Date("2026-01-01T19:00:00"))).toBe("Good evening");
    expect(timeOfDayGreeting(new Date("2026-01-01T02:00:00"))).toBe("Still up");
  });
});

describe("greetingHeadline", () => {
  it("includes the user's name when provided", () => {
    expect(greetingHeadline("Bhakti", new Date("2026-01-01T08:00:00"))).toBe(
      "Good morning, Bhakti",
    );
  });

  it("falls back to a plain greeting with no name", () => {
    expect(greetingHeadline(null, new Date("2026-01-01T08:00:00"))).toBe("Good morning");
  });
});

describe("motivationalLine", () => {
  it("prompts a first upload for a brand-new user", () => {
    expect(
      motivationalLine({ streakDays: 0, overallMastery: null, isReturningUser: false }),
    ).toMatch(/upload/i);
  });

  it("prioritizes a notable streak over mastery level", () => {
    expect(
      motivationalLine({ streakDays: 5, overallMastery: 20, isReturningUser: true }),
    ).toMatch(/streak/i);
  });

  it("does not call a single day a streak", () => {
    expect(
      motivationalLine({ streakDays: 1, overallMastery: 70, isReturningUser: true }),
    ).not.toMatch(/streak/i);
  });

  it("encourages rather than discourages at low mastery", () => {
    const line = motivationalLine({ streakDays: 0, overallMastery: 30, isReturningUser: true });
    expect(line.toLowerCase()).not.toMatch(/fail|bad|behind/);
  });
});
