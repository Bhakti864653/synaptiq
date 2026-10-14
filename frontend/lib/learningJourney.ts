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

// The material page's step bar: Quiz → Study guide → Practice → Flashcards.
// Which one to highlight comes from the same single real signal (the
// current concept's mastery) plus whether the quiz exists yet - never from
// claimed-complete steps.
export type MaterialStep = "quiz" | "study-guide" | "practice" | "flashcards";

export const MATERIAL_STEP_LABEL: Record<MaterialStep, string> = {
  quiz: "Quiz",
  "study-guide": "Study guide",
  practice: "Practice",
  flashcards: "Flashcards",
};

export function recommendedStep({
  quizReady,
  mastery,
}: {
  quizReady: boolean;
  mastery: number | null;
}): MaterialStep {
  // A material whose quiz isn't generated yet starts in the Study guide,
  // which sets up its topics (the quiz isn't available until then).
  if (!quizReady) return "study-guide";
  if (mastery === null) return "quiz";
  if (mastery < 50) return "study-guide";
  if (mastery < 80) return "practice";
  return "flashcards";
}
