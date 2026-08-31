"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import { masteryColorVar } from "@/lib/mastery";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import QuestionBlock from "@/components/QuestionBlock";
import StudySetup from "./StudySetup";
import { useMascot } from "@/lib/mascotContext";

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

function TopicBody({
  documentId,
  concept,
  onAdvance,
}: {
  documentId: string;
  concept: Concept;
  onAdvance: () => void;
}) {
  const router = useRouter();
  const { celebrate } = useMascot();
  const [guide, setGuide] = useState<{ summary: string; excerpt: string } | null>(
    concept.summary && concept.excerpt
      ? { summary: concept.summary, excerpt: concept.excerpt }
      : null,
  );
  const [loadingGuide, setLoadingGuide] = useState(!guide);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [altExplanation, setAltExplanation] = useState<string | null>(null);
  const [loadingAlt, setLoadingAlt] = useState<
    "simpler" | "analogy" | "example" | null
  >(null);

  async function explainDifferently(style: "simpler" | "analogy" | "example") {
    setLoadingAlt(style);
    setError(null);
    try {
      const res = await authFetch(
        `/documents/${documentId}/concepts/${concept.id}/explain-differently`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      setAltExplanation(body.explanation);
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: () => explainDifferently(style),
      });
    } finally {
      setLoadingAlt(null);
    }
  }

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
      setConfidences({});
      setResults({});
      setSubmitted(false);
      setScorePct(null);
      celebrate("excited", `Let's see what you know about ${concept.name}!`);
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
        confidence: confidences[q.id] ?? null,
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
      if (pct >= PASS_THRESHOLD) {
        celebrate(
          "celebrating",
          pct === 100
            ? `Perfect score on ${concept.name}!`
            : `Nice work — ${pct}% on ${concept.name}!`,
        );
        onAdvance();
      } else {
        celebrate(
          "encouraging",
          `${pct}% on ${concept.name} — worth another look, you've got this.`,
        );
      }
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

              {altExplanation && (
                <Card className="border-l-2 border-l-mastered">
                  <p className="text-xs font-medium text-ink-muted">
                    Explained differently
                  </p>
                  <p className="mt-1 text-sm text-ink">{altExplanation}</p>
                </Card>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-muted">Explain it differently:</span>
                <Button
                  variant="secondary"
                  onClick={() => explainDifferently("simpler")}
                  disabled={loadingAlt !== null}
                  className="w-fit"
                >
                  {loadingAlt === "simpler" ? "Thinking..." : "Simpler"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => explainDifferently("analogy")}
                  disabled={loadingAlt !== null}
                  className="w-fit"
                >
                  {loadingAlt === "analogy" ? "Thinking..." : "Analogy"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => explainDifferently("example")}
                  disabled={loadingAlt !== null}
                  className="w-fit"
                >
                  {loadingAlt === "example" ? "Thinking..." : "Real-world example"}
                </Button>
              </div>
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
              confidence={confidences[q.id]}
              onConfidence={(v) => setConfidences((prev) => ({ ...prev, [q.id]: v }))}
            />
          ))}

          {!submitted && (
            <Button
              onClick={submitQuiz}
              disabled={
                submitting ||
                questions.some((q) => confidences[q.id] === undefined)
              }
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
                    You scored {scorePct}% — we recommend reviewing before moving
                    on.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={startQuiz}
                      disabled={generating}
                      className="w-fit"
                    >
                      {generating ? "Preparing quiz..." : "Try again"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={onAdvance}
                      className="w-fit"
                    >
                      Continue anyway
                    </Button>
                  </div>
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
  initialExamDate,
  onPlanned,
}: {
  documentId: string;
  initialExamDate: string | null;
  onPlanned: (plan: { days_until_exam: number; minutesByConcept: Record<string, number> }) => void;
}) {
  const router = useRouter();
  const [examDate, setExamDate] = useState(initialExamDate ?? "");
  const [savedExamDate, setSavedExamDate] = useState(initialExamDate);
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
}: {
  documentId: string;
  concepts: Concept[];
  mastery: Mastery[];
  examDate: string | null;
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

      <StudyPlanForm
        documentId={documentId}
        initialExamDate={examDate}
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
