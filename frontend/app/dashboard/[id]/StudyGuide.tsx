"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import { masteryColorVar } from "@/lib/mastery";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import QuestionBlock from "@/components/QuestionBlock";

type Concept = {
  id: string;
  name: string;
  order_index: number;
  summary: string | null;
  excerpt: string | null;
};
type Mastery = { concept_id: string; mastery_score: number };
type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Result = { is_correct: boolean; correct_index: number };

const PASS_THRESHOLD = 80;

async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

function TopicBody({
  documentId,
  concept,
  onPassed,
}: {
  documentId: string;
  concept: Concept;
  onPassed: () => void;
}) {
  const router = useRouter();
  const [guide, setGuide] = useState<{ summary: string; excerpt: string } | null>(
    concept.summary && concept.excerpt
      ? { summary: concept.summary, excerpt: concept.excerpt }
      : null,
  );
  const [loadingGuide, setLoadingGuide] = useState(!guide);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function loadGuide() {
    setLoadingGuide(true);
    setError(null);
    try {
      const res = await authFetch(
        `/documents/${documentId}/concepts/${concept.id}/guide`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      setGuide(await res.json());
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: loadGuide });
    } finally {
      setLoadingGuide(false);
    }
  }

  useEffect(() => {
    if (!guide) loadGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startQuiz() {
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch(
        `/documents/${documentId}/concepts/${concept.id}/quiz`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      setQuestions(body.questions);
      setAnswers({});
      setResults({});
      setSubmitted(false);
      setScorePct(null);
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: startQuiz });
    } finally {
      setGenerating(false);
    }
  }

  async function submitQuiz() {
    if (!questions) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_index: answers[q.id] ?? -1,
      }));
      const res = await authFetch(`/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      const nextResults: Record<string, Result> = {};
      let correct = 0;
      for (const r of body.results as (Result & { question_id: string })[]) {
        nextResults[r.question_id] = {
          is_correct: r.is_correct,
          correct_index: r.correct_index,
        };
        if (r.is_correct) correct += 1;
      }
      setResults(nextResults);
      setSubmitted(true);
      const pct = Math.round((100 * correct) / questions.length);
      setScorePct(pct);
      router.refresh();
      if (pct >= PASS_THRESHOLD) onPassed();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: submitQuiz });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!questions && (
        <>
          {loadingGuide && <p className="text-sm text-ink-muted">Loading...</p>}
          {guide && (
            <div className="flex flex-col gap-3">
              {guide.summary.split("\n\n").map((para, i) => (
                <p key={i} className="text-ink">
                  {para}
                </p>
              ))}
              <Card className="border-l-2 border-l-brand">
                <p className="text-xs font-medium text-ink-muted">
                  From your material
                </p>
                <p className="mt-1 text-sm italic text-ink">"{guide.excerpt}"</p>
              </Card>
            </div>
          )}
          {guide && (
            <Button onClick={startQuiz} disabled={generating} className="w-fit">
              {generating ? "Preparing quiz..." : "Take the quiz"}
            </Button>
          )}
        </>
      )}

      {questions && (
        <Card className="flex flex-col gap-6">
          {questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
            />
          ))}

          {!submitted && (
            <Button
              onClick={submitQuiz}
              disabled={submitting || Object.keys(answers).length < questions.length}
              className="w-fit"
            >
              {submitting ? "Submitting..." : "Submit answers"}
            </Button>
          )}

          {submitted && scorePct !== null && (
            <div className="flex flex-col gap-3">
              {scorePct >= PASS_THRESHOLD ? (
                <p className="font-medium text-mastered">
                  Passed — {scorePct}%. Next topic unlocked.
                </p>
              ) : (
                <>
                  <p className="font-medium text-weak">
                    You got {scorePct}% — need {PASS_THRESHOLD}% to unlock the next
                    topic.
                  </p>
                  <Button onClick={startQuiz} disabled={generating} className="w-fit">
                    {generating ? "Preparing quiz..." : "Try again"}
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function StudyPlanForm({
  documentId,
  onPlanned,
}: {
  documentId: string;
  onPlanned: (plan: { days_until_exam: number; minutesByConcept: Record<string, number> }) => void;
}) {
  const router = useRouter();
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("1");
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
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}

export default function StudyGuide({
  documentId,
  concepts,
  mastery,
}: {
  documentId: string;
  concepts: Concept[];
  mastery: Mastery[];
}) {
  const masteryByConcept = new Map(
    mastery.map((m) => [m.concept_id, m.mastery_score]),
  );

  // Walk front-to-back and stop at the first not-yet-passed topic - robust
  // even after the study-plan endpoint reorders not-yet-passed topics,
  // since already-passed topics are never moved and so always stay a
  // contiguous, unbroken prefix.
  let unlockedUpTo = 0;
  for (let i = 1; i < concepts.length; i++) {
    if ((masteryByConcept.get(concepts[i - 1].id) ?? 0) >= PASS_THRESHOLD) {
      unlockedUpTo = i;
    } else {
      break;
    }
  }

  const [openId, setOpenId] = useState<string | null>(
    concepts[unlockedUpTo]?.id ?? null,
  );
  const [plan, setPlan] = useState<{
    days_until_exam: number;
    minutesByConcept: Record<string, number>;
  } | null>(null);

  if (concepts.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Generate the diagnostic quiz first so there are topics to study.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Study Guide</h2>

      <StudyPlanForm documentId={documentId} onPlanned={setPlan} />
      {plan && (
        <p className="text-sm text-ink-muted">
          {plan.days_until_exam} day{plan.days_until_exam === 1 ? "" : "s"} until
          your exam — topics below are ordered by urgency.
        </p>
      )}

      {concepts.map((c, i) => {
        const score = masteryByConcept.get(c.id) ?? 0;
        const locked = i > unlockedUpTo && score < PASS_THRESHOLD;
        const isOpen = openId === c.id;
        const minutes = plan?.minutesByConcept[c.id];

        return (
          <Card key={c.id} className="flex flex-col gap-3">
            <button
              onClick={() => !locked && setOpenId(isOpen ? null : c.id)}
              disabled={locked}
              className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed"
            >
              <span className={locked ? "text-ink-muted" : "text-ink"}>
                {i + 1}. {c.name}
              </span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                {locked ? (
                  "Locked"
                ) : (
                  <>
                    {minutes !== undefined && (
                      <span className="font-mono">{formatMinutes(minutes)}</span>
                    )}
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: masteryColorVar(score) }}
                    />
                    {score}%
                  </>
                )}
              </span>
            </button>

            {locked && (
              <p className="text-xs text-ink-muted">
                Finish "{concepts[i - 1]?.name}" with {PASS_THRESHOLD}%+ to unlock.
              </p>
            )}

            {!locked && isOpen && (
              <TopicBody
                documentId={documentId}
                concept={c}
                onPassed={() => {
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
