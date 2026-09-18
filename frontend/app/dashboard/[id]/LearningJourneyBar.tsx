import { journeyStageStatus, type JourneyStage } from "@/lib/learningJourney";

const STAGES: { id: JourneyStage; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "recall", label: "Recall" },
  { id: "practice", label: "Practice" },
  { id: "review", label: "Review" },
];

// A slim, real progress indicator - status per stage comes straight from
// journeyStageStatus (derived from the concept's own mastery score), never
// a hardcoded "step 2 of 4" fake completion.
export default function LearningJourneyBar({ mastery }: { mastery: number | null }) {
  return (
    <div className="flex items-center gap-2" role="list" aria-label="Learning journey for this concept">
      {STAGES.map((stage, i) => {
        const status = journeyStageStatus(stage.id, mastery);
        return (
          <div key={stage.id} className="flex items-center gap-2" role="listitem">
            {i > 0 && <span aria-hidden className="h-px w-4 bg-line" />}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                status === "done"
                  ? "bg-[var(--mastered)]/15 text-[var(--mastered)]"
                  : status === "current"
                    ? "bg-brand text-brand-ink"
                    : "text-ink-muted"
              }`}
            >
              {status === "done" && <span aria-hidden>{"✓"}</span>}
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
