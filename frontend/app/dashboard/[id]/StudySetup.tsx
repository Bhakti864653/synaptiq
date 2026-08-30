"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import QuestionBlock from "@/components/QuestionBlock";

type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Result = { is_correct: boolean; correct_index: number };

type Step = "minutes" | "starting-point" | "diagnostic";

export default function StudySetup({
  documentId,
  onReady,
}: {
  documentId: string;
  onReady: (minutesByConcept: Record<string, number>) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("minutes");
  const [minutesInput, setMinutesInput] = useState("60");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  // Which action is in flight, if any - lets each button show its own
  // busy label instead of both reacting to one shared flag.
  const [busy, setBusy] = useState<"zero" | "diagnostic" | "submit" | null>(
    null,
  );
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  const minutesAvailable = Math.max(parseInt(minutesInput, 10) || 0, 1);

  async function finishSetup(nextBusy: "zero" | "submit" = "zero") {
    setBusy(nextBusy);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/study-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes_available: minutesAvailable }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      onReady(body.minutes_by_concept);
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: () => finishSetup(nextBusy) });
    } finally {
      setBusy(null);
    }
  }

  async function startDiagnostic() {
    setBusy("diagnostic");
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/generate-quiz`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      setQuestions(body.questions);
      setStep("diagnostic");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: startDiagnostic });
    } finally {
      setBusy(null);
    }
  }

  async function submitDiagnostic() {
    if (!questions) return;
    setBusy("submit");
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
      const resultBody = await res.json();
      const nextResults: Record<string, Result> = {};
      for (const r of resultBody.results as (Result & { question_id: string })[]) {
        nextResults[r.question_id] = {
          is_correct: r.is_correct,
          correct_index: r.correct_index,
        };
      }
      setResults(nextResults);
      await finishSetup("submit");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: submitDiagnostic });
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Set up your Study Guide</h2>

      {step === "minutes" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            How much time do you have to study this material?
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="5"
                step="5"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-ink-muted">minutes</span>
            </div>
          </label>
          <Button
            onClick={() => setStep("starting-point")}
            disabled={minutesAvailable < 1}
            className="w-fit"
          >
            Continue
          </Button>
        </div>
      )}

      {step === "starting-point" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">
            Are you starting from zero, or do you already know some of this
            material?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => finishSetup("zero")}
              disabled={busy !== null}
              className="w-fit"
            >
              {busy === "zero" ? "Setting up..." : "Starting from zero"}
            </Button>
            <Button
              variant="secondary"
              onClick={startDiagnostic}
              disabled={busy !== null}
              className="w-fit"
            >
              {busy === "diagnostic" ? "Preparing..." : "I know some of this"}
            </Button>
          </div>
        </div>
      )}

      {step === "diagnostic" && questions && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            A short diagnostic quiz - your answers decide how much time each
            topic gets.
          </p>
          {questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
            />
          ))}
          <Button
            onClick={submitDiagnostic}
            disabled={busy !== null || Object.keys(answers).length < questions.length}
            className="w-fit"
          >
            {busy === "submit"
              ? "Building your study guide..."
              : "Submit and build my study guide"}
          </Button>
        </div>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}
