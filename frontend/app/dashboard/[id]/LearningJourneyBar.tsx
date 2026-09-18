import { JOURNEY_STAGE_LABEL, recommendedStage } from "@/lib/learningJourney";

// Deliberately quiet and secondary - a single honest "what's next"
// suggestion, not a checklist of claimed-complete steps this schema can't
// actually prove happened (see lib/learningJourney.ts).
export default function LearningJourneyBar({ mastery }: { mastery: number | null }) {
  const stage = recommendedStage(mastery);

  if (stage === "mastered") {
    return (
      <p className="text-xs text-ink-muted">
        <span className="text-[var(--mastered)]">{"✓"}</span> Mastered
      </p>
    );
  }

  return (
    <p className="text-xs text-ink-muted">
      Suggested next step: <span className="font-medium text-ink">{JOURNEY_STAGE_LABEL[stage]}</span>
    </p>
  );
}
