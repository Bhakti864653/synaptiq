"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import { classifyPracticeReadiness, type DocSummary } from "@/lib/practiceReadiness";
import { useDocumentPolling } from "@/lib/useDocumentPolling";
import { isStalledProcessing } from "@/lib/documentStatus";
import ErrorMessage from "@/components/ErrorMessage";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import RetryProcessingButton from "@/components/RetryProcessingButton";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuestionBlock from "@/components/QuestionBlock";
import QuizResultBanner from "@/components/QuizResultBanner";
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

function readinessMessage(code: string): string {
  switch (code) {
    case "NO_DOCUMENTS":
      return "Upload your first study material to begin practicing.";
    case "PROCESSING":
      return "Your material is still being prepared. Practice will unlock when it's ready.";
    case "PROCESSING_FAILED":
      return "Processing failed for your material.";
    case "SETUP_REQUIRED":
      return "Set up this material before starting personalized practice.";
    default:
      return "Practice isn't ready yet.";
  }
}

// Before ever enabling "Start practice," works out the user's actual state
// from their documents (not just from concept-count zero/non-zero) so the
// message and action shown always match what would really happen if they
// clicked the button - the button itself is disabled instead until that's
// true, so a click can never surface a misleading backend error.
export default function PracticeSession({
  initialDocuments,
}: {
  initialDocuments: DocSummary[];
}) {
  const { celebrate } = useMascot();
  const [documents, setDocuments] = useState(initialDocuments);
  const { unreachable } = useDocumentPolling(documents, setDocuments);
  const readiness = classifyPracticeReadiness(documents);
  const blockingDoc = documents.find((d) => d.id === readiness.documentId);
  const blockingDocStalled =
    readiness.code === "PROCESSING" &&
    !!blockingDoc &&
    isStalledProcessing(blockingDoc.status, blockingDoc.processing_started_at);

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
        const detail = body.detail;
        const message =
          typeof detail === "object" && detail?.message
            ? detail.message
            : typeof detail === "string"
              ? detail
              : `Failed (${res.status})`;
        throw new Error(message);
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
        {readiness.code === "READY" ? (
          <Button onClick={startPractice} disabled={generating} className="w-fit">
            {generating ? "Building your practice session..." : "Start practice"}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {readiness.code === "PROCESSING" && !blockingDocStalled ? (
              <ProcessingIndicator label={readinessMessage(readiness.code)} />
            ) : blockingDocStalled ? (
              <p className="text-sm text-weak">
                Processing appears stuck. It&apos;s been running longer than expected.
              </p>
            ) : (
              <p className="text-sm text-ink-muted">{readinessMessage(readiness.code)}</p>
            )}

            {readiness.code === "NO_DOCUMENTS" && (
              <Link href="/dashboard">
                <Button variant="secondary" className="w-fit">
                  Go to upload
                </Button>
              </Link>
            )}
            {(readiness.code === "PROCESSING_FAILED" ||
              (readiness.code === "PROCESSING" && blockingDocStalled)) &&
              readiness.documentId && (
                <RetryProcessingButton
                  documentId={readiness.documentId}
                  onResult={(result) =>
                    setDocuments((prev) =>
                      prev.map((d) =>
                        d.id === readiness.documentId
                          ? { ...d, ...result, processing_started_at: null }
                          : d,
                      ),
                    )
                  }
                />
              )}
            {readiness.code === "SETUP_REQUIRED" && readiness.documentId && (
              <Link href={`/dashboard/${readiness.documentId}`}>
                <Button variant="secondary" className="w-fit">
                  Set up material
                </Button>
              </Link>
            )}
            {unreachable && (
              <p className="text-xs text-ink-muted">
                Having trouble checking for updates - this will keep retrying automatically.
              </p>
            )}
          </div>
        )}
        {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
      </Card>
    );
  }

  const allAnswered = questions.every(
    (q) => answers[q.id] !== undefined && confidences[q.id] !== undefined,
  );
  const allSubmitted = questions.every((q) => results[q.id]);
  const scorePct = allSubmitted
    ? Math.round(
        (100 * questions.filter((q) => results[q.id]?.is_correct).length) /
          questions.length,
      )
    : null;

  return (
    <Card className="flex flex-col gap-6">
      {scorePct !== null && (
        <QuizResultBanner
          scorePct={scorePct}
          supportHint={
            <p className="text-sm text-ink-muted">
              Open the document&apos;s Tutor tab to talk through what you missed.
            </p>
          }
        />
      )}
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
