"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuestionBlock from "@/components/QuestionBlock";
import { useMascot } from "@/lib/mascotContext";
import { celebrateFromResults } from "@/lib/mascotMessages";

type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
  concept_name: string;
  document_filename: string;
};
type Result = { is_correct: boolean; correct_index: number };

export default function PracticeSession() {
  const { celebrate } = useMascot();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function startPractice() {
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch(`/practice`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      setQuestions(body.questions);
      setAnswers({});
      setConfidences({});
      setResults({});
      celebrate("excited", "Let's tackle your weakest concepts!");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: startPractice });
    } finally {
      setGenerating(false);
    }
  }

  async function submitAnswers() {
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
      for (const r of body.results as (Result & { question_id: string })[]) {
        nextResults[r.question_id] = {
          is_correct: r.is_correct,
          correct_index: r.correct_index,
        };
      }
      setResults(nextResults);
      celebrateFromResults(celebrate, body.results, "this practice set");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: submitAnswers });
    } finally {
      setSubmitting(false);
    }
  }

  if (!questions) {
    return (
      <Card className="flex flex-col gap-3">
        <Button onClick={startPractice} disabled={generating} className="w-fit">
          {generating ? "Building your practice session..." : "Start practice"}
        </Button>
        {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
      </Card>
    );
  }

  const allAnswered = questions.every(
    (q) => answers[q.id] !== undefined && confidences[q.id] !== undefined,
  );
  const allSubmitted = questions.every((q) => results[q.id]);

  return (
    <Card className="flex flex-col gap-6">
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">
            {q.concept_name} · {q.document_filename}
          </p>
          <QuestionBlock
            question={q}
            selected={answers[q.id]}
            result={results[q.id]}
            onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
            confidence={confidences[q.id]}
            onConfidence={(v) => setConfidences((prev) => ({ ...prev, [q.id]: v }))}
            voice
          />
        </div>
      ))}

      {!allSubmitted ? (
        <Button
          onClick={submitAnswers}
          disabled={submitting || !allAnswered}
          className="w-fit"
        >
          {submitting ? "Submitting..." : "Submit answers"}
        </Button>
      ) : (
        <Button onClick={startPractice} disabled={generating} className="w-fit">
          {generating ? "Building your practice session..." : "Practice again"}
        </Button>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}
