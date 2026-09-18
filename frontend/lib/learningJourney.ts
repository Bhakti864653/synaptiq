// The Read -> Recall -> Practice -> Review journey for one concept,
// derived entirely from its real mastery score - never a fabricated
// progress indicator. "Read" is always reached once a concept is the one
// being viewed; the other three stages require increasing real evidence
// of practice (an attempted score, a passing score, a mastered score).
export type JourneyStage = "read" | "recall" | "practice" | "review";

export function journeyStageStatus(
  stage: JourneyStage,
  mastery: number | null,
): "done" | "current" | "upcoming" {
  const stages: JourneyStage[] = ["read", "recall", "practice", "review"];
  const reached: Record<JourneyStage, boolean> = {
    read: true,
    recall: mastery !== null,
    practice: mastery !== null && mastery >= 50,
    review: mastery !== null && mastery >= 80,
  };

  if (reached[stage]) {
    const nextStage = stages[stages.indexOf(stage) + 1];
    // The frontier stage - reached, but the next one isn't yet - reads as
    // "current" rather than "done", so the journey always shows exactly
    // one active step instead of every reached step looking identical.
    // The final stage, once reached, is simply complete - there's no
    // further stage left to be a frontier against.
    if (nextStage && !reached[nextStage]) return "current";
    return "done";
  }
  return "upcoming";
}
