"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import { masteryColorVar } from "@/lib/mastery";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import StudySetup from "./StudySetup";
import TopicBody from "./TopicBody";
import DailyPlan from "./DailyPlan";

type Concept = {
  id: string;
  name: string;
  order_index: number;
  summary: string | null;
  excerpt: string | null;
  scheduled_date: string | null;
};
type Mastery = { concept_id: string; mastery_score: number };

const PASS_THRESHOLD = 80;

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function StudyPlanForm({
  documentId,
  initialExamDate,
  initialHoursPerDay,
  onPlanned,
}: {
  documentId: string;
  initialExamDate: string | null;
  initialHoursPerDay: number | null;
  onPlanned: (plan: { days_until_exam: number; minutesByConcept: Record<string, number> }) => void;
}) {
  const router = useRouter();
  const [examDate, setExamDate] = useState(initialExamDate ?? "");
  const [savedExamDate, setSavedExamDate] = useState(initialExamDate);
  const [hoursPerDay, setHoursPerDay] = useState(
    initialHoursPerDay?.toString() ?? "1",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function buildPlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_date: examDate,
          hours_per_day: parseFloat(hoursPerDay),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      const minutesByConcept: Record<string, number> = {};
      for (const item of body.plan as { concept_id: string; minutes: number }[]) {
        minutesByConcept[item.concept_id] = item.minutes;
      }
      onPlanned({ days_until_exam: body.days_until_exam, minutesByConcept });
      setSavedExamDate(examDate);
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: buildPlan });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    buildPlan();
  }

  return (
    <Card className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Exam date
          <Input
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Hours/day available
          <Input
            type="number"
            min="0.25"
            step="0.25"
            required
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(e.target.value)}
            className="w-28"
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Planning..." : "Build study plan"}
        </Button>
      </form>
      <p className="text-xs text-ink-muted">
        Reorders the topics you haven't passed yet by urgency, and estimates time
        per topic. Topics you've already passed stay where they are.
      </p>
      {savedExamDate && (
        <p className="text-xs text-mastered">
          Reminder emails on until {savedExamDate}.
        </p>
      )}
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}

export default function StudyGuide({
  documentId,
  concepts,
  mastery,
  examDate,
  hoursPerDay,
}: {
  documentId: string;
  concepts: Concept[];
  mastery: Mastery[];
  examDate: string | null;
  hoursPerDay: number | null;
}) {
  const masteryByConcept = new Map(
    mastery.map((m) => [m.concept_id, m.mastery_score]),
  );

  // Walk front-to-back and stop at the first not-yet-passed topic - purely
  // to pick which topic is "recommended next" and to badge topics reached
  // out of order. Nothing below is actually disabled - a low score is a
  // recommendation to review, never a hard block on moving forward.
  let recommendedUpTo = 0;
  for (let i = 1; i < concepts.length; i++) {
    if ((masteryByConcept.get(concepts[i - 1].id) ?? 0) >= PASS_THRESHOLD) {
      recommendedUpTo = i;
    } else {
      break;
    }
  }

  const [openId, setOpenId] = useState<string | null>(
    concepts[recommendedUpTo]?.id ?? null,
  );
  // Concepts the user chose "Continue anyway" on this session, so they no
  // longer show a review nudge even though their score is still < 80%.
  const [advancedIds, setAdvancedIds] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<{
    days_until_exam?: number;
    minutesByConcept: Record<string, number>;
  } | null>(null);

  if (concepts.length === 0) {
    return (
      <StudySetup
        documentId={documentId}
        onReady={(minutesByConcept) => setPlan({ minutesByConcept })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Study Guide</h2>

      <DailyPlan documentId={documentId} concepts={concepts} mastery={mastery} />

      <StudyPlanForm
        documentId={documentId}
        initialExamDate={examDate}
        initialHoursPerDay={hoursPerDay}
        onPlanned={setPlan}
      />
      {plan?.days_until_exam !== undefined && (
        <p className="text-sm text-ink-muted">
          {plan.days_until_exam} day{plan.days_until_exam === 1 ? "" : "s"} until
          your exam — topics below are ordered by urgency.
        </p>
      )}

      {concepts.map((c, i) => {
        const score = masteryByConcept.get(c.id) ?? 0;
        // score === 0 is ambiguous (never attempted vs. a genuine 0%
        // attempt), and "never attempted" is by far the common case for a
        // topic reached out of order - so only nudge review for a topic
        // that shows real, if partial, evidence of an attempt.
        const reviewRecommended =
          i > recommendedUpTo &&
          score > 0 &&
          score < PASS_THRESHOLD &&
          !advancedIds.has(c.id);
        const isOpen = openId === c.id;
        const minutes = plan?.minutesByConcept[c.id];

        return (
          <Card key={c.id} className="flex flex-col gap-3">
            <button
              onClick={() => setOpenId(isOpen ? null : c.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-ink">
                {i + 1}. {c.name}
              </span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                {minutes !== undefined && (
                  <span className="font-mono">{formatMinutes(minutes)}</span>
                )}
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: masteryColorVar(score) }}
                />
                {score}%
                {reviewRecommended && (
                  <span className="rounded-full bg-weak/10 px-2 py-0.5 font-medium text-weak">
                    Review recommended
                  </span>
                )}
              </span>
            </button>

            {reviewRecommended && !isOpen && (
              <p className="text-xs text-ink-muted">
                You scored {score}% here - come back to review anytime.
              </p>
            )}

            {isOpen && (
              <TopicBody
                documentId={documentId}
                concept={c}
                onAdvance={() => {
                  setAdvancedIds((prev) => new Set(prev).add(c.id));
                  const next = concepts[i + 1];
                  if (next) setOpenId(next.id);
                }}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
