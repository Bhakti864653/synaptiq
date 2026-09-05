import Confetti from "@/components/Confetti";
import { getScoreTier } from "@/lib/quizCelebration";

// Shared post-submit banner for every quiz surface (diagnostic, in-document
// and cross-document practice, Study Guide topic quizzes). `celebrate=false`
// keeps the same four text tiers but drops the confetti/checkmark flourish -
// used for the diagnostic quiz, since a first-look-at-the-material quiz
// isn't the moment for an earned-progress celebration.
export default function QuizResultBanner({
  scorePct,
  celebrate = true,
  unlockNote,
  supportHint,
}: {
  scorePct: number;
  celebrate?: boolean;
  unlockNote?: string;
  supportHint?: React.ReactNode;
}) {
  const tier = getScoreTier(scorePct);
  const accent = tier === "perfect" || tier === "great" ? "border-l-mastered" : "border-l-brand";

  return (
    <div
      className={`relative overflow-hidden rounded-[12px_5px_12px_5px] border-l-2 ${accent} bg-paper/60 px-4 py-3 dark:bg-black/10`}
    >
      {celebrate && tier === "perfect" && <Confetti />}
      <div className="flex flex-col gap-2">
        {tier === "perfect" && (
          <>
            <p className="text-xl font-bold text-ink">Perfect score!</p>
            <p className="text-sm text-ink-muted">Every question, nailed.</p>
          </>
        )}

        {tier === "great" && (
          <>
            <p className="flex items-center gap-2 text-lg font-semibold text-mastered">
              {celebrate && (
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="h-5 w-5 shrink-0 fill-current"
                >
                  <path d="M7.6 13.4 3.8 9.6l1.4-1.4 2.4 2.4 6.2-6.2 1.4 1.4z" />
                </svg>
              )}
              Great job! {scorePct}%
            </p>
            <p className="text-sm text-ink-muted">
              {unlockNote ?? "Solid grasp of this material."}
            </p>
          </>
        )}

        {tier === "good" && (
          <>
            <p className="text-lg font-medium text-ink">Good progress — {scorePct}%</p>
            <p className="text-sm text-ink-muted">
              A bit more practice and you&apos;ve got this.
            </p>
          </>
        )}

        {tier === "support" && (
          <>
            <p className="text-lg font-medium text-ink">Let&apos;s review this together</p>
            <p className="text-sm text-ink-muted">You scored {scorePct}%.</p>
            {supportHint}
          </>
        )}
      </div>
    </div>
  );
}
