"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuestionBlock from "@/components/QuestionBlock";
import QuizResultBanner from "@/components/QuizResultBanner";
import ReadAloud from "@/components/ReadAloud";
import { useMascot } from "@/lib/mascotContext";

export type TopicConcept = {
  id: string;
  name: string;
  summary: string | null;
  excerpt: string | null;
};
type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Result = { is_correct: boolean; correct_index: number };

const PASS_THRESHOLD = 80;

// Guide (AI explanation + verbatim excerpt) and quiz for ONE topic - shared
// by the Study Guide's manual topic accordion and the day-by-day plan view,
// so both surface the exact same content/quiz-scoring for a given concept.
export default function TopicBody({
  documentId,
  concept,
  onAdvance,
}: {
  documentId: string;
  concept: TopicConcept;
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
              <ReadAloud
                paragraphs={guide.summary.split("\n\n")}
                documentId={documentId}
              />
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
              <QuizResultBanner
                scorePct={scorePct}
                unlockNote={
                  scorePct >= PASS_THRESHOLD ? "Next topic unlocked." : undefined
                }
                supportHint={
                  <Button
                    variant="secondary"
                    onClick={() => setQuestions(null)}
                    className="w-fit"
                  >
                    Review the explanation
                  </Button>
                }
              />
              {scorePct < PASS_THRESHOLD && (
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
              )}
            </div>
          )}
        </Card>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
