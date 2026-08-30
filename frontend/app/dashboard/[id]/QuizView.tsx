"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import MasteryBar from "@/components/MasteryBar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuestionBlock from "@/components/QuestionBlock";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";

type Concept = { id: string; name: string };
type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Mastery = { concept_id: string; mastery_score: number };
type Result = { is_correct: boolean; correct_index: number };

export default function QuizView({
  documentId,
  status,
  concepts,
  questions,
  mastery,
}: {
  documentId: string;
  status: string;
  concepts: Concept[];
  questions: Question[];
  mastery: Mastery[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [latestMastery, setLatestMastery] = useState<Mastery[] | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[] | null>(
    null,
  );
  const [practicing, setPracticing] = useState(false);
  const [submittingPractice, setSubmittingPractice] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/generate-quiz`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleGenerate });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
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
      const result = await res.json();
      setLatestMastery(result.mastery_updates);
      setResults((prev) => {
        const next = { ...prev };
        for (const r of result.results as (Result & {
          question_id: string;
        })[]) {
          next[r.question_id] = { is_correct: r.is_correct, correct_index: r.correct_index };
        }
        return next;
      });
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleSubmit });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePractice() {
    setPracticing(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/practice`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const result = await res.json();
      setPracticeQuestions(result.questions);
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handlePractice });
    } finally {
      setPracticing(false);
    }
  }

  async function handleSubmitPractice() {
    if (!practiceQuestions) return;
    setSubmittingPractice(true);
    setError(null);
    try {
      const payload = practiceQuestions.map((q) => ({
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
      const result = await res.json();
      setLatestMastery((prev) => {
        const merged = new Map(
          (prev ?? mastery).map((m) => [m.concept_id, m.mastery_score]),
        );
        for (const m of result.mastery_updates as Mastery[]) {
          merged.set(m.concept_id, m.mastery_score);
        }
        return Array.from(merged, ([concept_id, mastery_score]) => ({
          concept_id,
          mastery_score,
        }));
      });
      setResults((prev) => {
        const next = { ...prev };
        for (const r of result.results as (Result & {
          question_id: string;
        })[]) {
          next[r.question_id] = { is_correct: r.is_correct, correct_index: r.correct_index };
        }
        return next;
      });
      router.refresh();
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: handleSubmitPractice,
      });
    } finally {
      setSubmittingPractice(false);
    }
  }

  const masteryByConcept = new Map(
    (latestMastery ?? mastery).map((m) => [m.concept_id, m.mastery_score]),
  );

  if (status === "uploaded" || status === "processing") {
    return (
      <p className="text-sm text-ink-muted">
        Still processing this document — check back in a moment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {concepts.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Concepts</h2>
          {concepts.map((c) => (
            <MasteryBar
              key={c.id}
              label={c.name}
              score={masteryByConcept.get(c.id) ?? 0}
            />
          ))}
        </Card>
      )}

      {status === "processed" && (
        <p className="text-sm text-ink-muted">
          Head to the Study Guide tab to get started - it'll set up topics
          for this material and bring you back here if you want the full
          diagnostic quiz.
        </p>
      )}

      {status === "quiz_ready" && questions.length > 0 && (
        <Card className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-ink">Diagnostic quiz</h2>
          {questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
              voice
            />
          ))}
          <div className="flex items-center gap-4">
            <Button onClick={handleSubmit} disabled={submitting} className="w-fit">
              {submitting ? "Submitting..." : "Submit answers"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleGenerate}
              disabled={generating}
              className="w-fit px-0"
            >
              {generating ? "Regenerating..." : "Regenerate quiz"}
            </Button>
          </div>
        </Card>
      )}

      {status === "quiz_ready" && !practiceQuestions && (
        <Button onClick={handlePractice} disabled={practicing} className="w-fit">
          {practicing ? "Generating practice..." : "Practice weak concepts"}
        </Button>
      )}

      {practiceQuestions && (
        <Card className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-ink">Practice session</h2>
          {practiceQuestions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
              voice
            />
          ))}
          {practiceQuestions.some((q) => !results[q.id]) ? (
            <Button
              onClick={handleSubmitPractice}
              disabled={submittingPractice}
              className="w-fit"
            >
              {submittingPractice ? "Submitting..." : "Submit answers"}
            </Button>
          ) : (
            <Button onClick={() => setPracticeQuestions(null)} className="w-fit">
              Done
            </Button>
          )}
        </Card>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
