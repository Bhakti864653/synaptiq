// A single recommended next step, not a row of "completed" claims - this
// schema has one mastery score per concept, not separately-recorded
// read/recall/practice/review events, so a 4-item checklist with
// checkmarks would be claiming completion the data can't actually prove.
// Presented instead as "what to do next," derived honestly from the one
// real signal available.
export type JourneyStage = "recall" | "practice" | "review";

export function recommendedStage(mastery: number | null): JourneyStage | "mastered" {
  if (mastery === null) return "recall";
  if (mastery < 50) return "practice";
  if (mastery < 80) return "review";
  return "mastered";
}

export const JOURNEY_STAGE_LABEL: Record<JourneyStage, string> = {
  recall: "Recall",
  practice: "Practice",
  review: "Review",
};
