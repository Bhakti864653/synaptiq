"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import MasteryBar from "@/components/MasteryBar";
import ConceptMasteryHistory from "@/components/ConceptMasteryHistory";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuestionBlock from "@/components/QuestionBlock";
import QuizResultBanner from "@/components/QuizResultBanner";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import { useMascot } from "@/lib/mascotContext";
import { celebrateFromResults } from "@/lib/mascotMessages";
import { useConceptFocus } from "@/lib/conceptFocus";

type Concept = { id: string; name: string };
type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Mastery = { concept_id: string; mastery_score: number };
type Result = { is_correct: boolean; correct_index: number };

// A submit only returns the concepts it touched, so keep everyone else's.
function mergeMastery(current: Mastery[], updates: Mastery[]): Mastery[] {
  const merged = new Map(current.map((m) => [m.concept_id, m.mastery_score]));
  for (const m of updates) merged.set(m.concept_id, m.mastery_score);
  return Array.from(merged, ([concept_id, mastery_score]) => ({ concept_id, mastery_score }));
}

export default function QuizView({
  documentId,
  status,
  concepts,
  questions,
  mastery,
  mode = "all",
}: {
  documentId: string;
  status: string;
  concepts: Concept[];
  questions: Question[];
  mastery: Mastery[];
  // The material page's step bar shows the diagnostic quiz and the
  // practice session as separate steps; "all" keeps both together.
  mode?: "all" | "quiz" | "practice";
}) {
  const showQuiz = mode !== "practice";
  const showPractice = mode !== "quiz";
  // On the material page, the picked concept narrows the quiz to its own
  // questions (with a way back to the whole quiz) and is what Practice
  // practices.
  const focus = useConceptFocus();
  const [wholeQuizFor, setWholeQuizFor] = useState<string | null>(null);
  const focusQuestions = focus ? questions.filter((q) => q.concept_id === focus.id) : [];
  const narrowed =
    !!focus &&
    focusQuestions.length > 0 &&
    focusQuestions.length < questions.length &&
    wholeQuizFor !== focus.id;
  const shownQuestions = narrowed ? focusQuestions : questions;
  const shownConcepts = narrowed ? concepts.filter((c) => c.id === focus?.id) : concepts;
  const router = useRouter();
  const { celebrate } = useMascot();
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
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
      const payload = shownQuestions.map((q) => ({
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
      const result = await res.json();
      setLatestMastery((prev) => mergeMastery(prev ?? mastery, result.mastery_updates));
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
      celebrateFromResults(celebrate, result.results, "the diagnostic quiz");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleSubmit });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePractice(conceptId?: string) {
    setPracticing(true);
    setError(null);
    try {
      const query = conceptId ? `?concept_id=${encodeURIComponent(conceptId)}` : "";
      const res = await authFetch(`/documents/${documentId}/practice${query}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const result = await res.json();
      setPracticeQuestions(result.questions);
      celebrate("excited", "Time to practice your weak spots!");
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: () => handlePractice(conceptId) });
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
      const result = await res.json();
      setLatestMastery((prev) => mergeMastery(prev ?? mastery, result.mastery_updates));
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
      celebrateFromResults(celebrate, result.results, "practice");
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

  const diagnosticSubmitted =
    shownQuestions.length > 0 && shownQuestions.every((q) => results[q.id]);
  const diagnosticScorePct = diagnosticSubmitted
    ? Math.round(
        (100 * shownQuestions.filter((q) => results[q.id]?.is_correct).length) /
          shownQuestions.length,
      )
    : null;

  const practiceSubmitted =
    !!practiceQuestions && practiceQuestions.every((q) => results[q.id]);
  const practiceScorePct =
    practiceSubmitted && practiceQuestions
      ? Math.round(
          (100 *
            practiceQuestions.filter((q) => results[q.id]?.is_correct).length) /
            practiceQuestions.length,
        )
      : null;

  const tutorHint = (
    <p className="text-sm text-ink-muted">
      Open the Tutor to talk through what you missed.
    </p>
  );

  if (status === "uploaded" || status === "processing") {
    return (
      <p className="text-sm text-ink-muted">
        Still preparing this document — this tab will update on its own once it&apos;s ready.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showQuiz && concepts.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">{narrowed ? "Concept" : "Concepts"}</h2>
          {shownConcepts.map((c) => {
            const score = masteryByConcept.get(c.id) ?? 0;
            return (
              <div key={c.id} className="flex flex-col gap-1">
                <MasteryBar label={c.name} score={score} />
                <ConceptMasteryHistory conceptId={c.id} masteryScore={score} />
              </div>
            );
          })}
        </Card>
      )}

      {status === "processed" && (
        <p className="text-sm text-ink-muted">
          {showQuiz
            ? "Start with the Study guide step - it sets up the topics in this material, then the full quiz unlocks here."
            : "Practice unlocks once the quiz is set up. Start with the Study guide step."}
        </p>
      )}

      {showQuiz && status === "quiz_ready" && questions.length > 0 && (
        <Card className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold text-ink">
              {narrowed && focus ? `Quiz: ${focus.name}` : "Diagnostic quiz"}
            </h2>
            {focus && focusQuestions.length > 0 && focusQuestions.length < questions.length && (
              <button
                type="button"
                onClick={() => setWholeQuizFor(narrowed ? focus.id : null)}
                className="text-sm font-medium text-ink-muted hover:text-ink"
              >
                {narrowed
                  ? `Show the whole quiz (${questions.length} questions)`
                  : `Only ${focus.name}`}
              </button>
            )}
          </div>
          {diagnosticScorePct !== null && (
            <QuizResultBanner
              scorePct={diagnosticScorePct}
              celebrate={false}
              supportHint={tutorHint}
            />
          )}
          {shownQuestions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
              confidence={confidences[q.id]}
              onConfidence={(v) => setConfidences((prev) => ({ ...prev, [q.id]: v }))}
              voice
            />
          ))}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                shownQuestions.some((q) => confidences[q.id] === undefined)
              }
              className="w-fit"
            >
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

      {showPractice && status === "quiz_ready" && !practiceQuestions && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {focus ? (
            <>
              <Button onClick={() => handlePractice(focus.id)} disabled={practicing} className="w-fit">
                {practicing ? "Generating practice..." : `Practice ${focus.name}`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handlePractice()}
                disabled={practicing}
                className="w-fit px-0"
              >
                Or practice your weakest concepts
              </Button>
            </>
          ) : (
            <Button onClick={() => handlePractice()} disabled={practicing} className="w-fit">
              {practicing ? "Generating practice..." : "Practice weak concepts"}
            </Button>
          )}
        </div>
      )}

      {showPractice && practiceQuestions && (
        <Card className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-ink">Practice session</h2>
          {practiceScorePct !== null && (
            <QuizResultBanner scorePct={practiceScorePct} supportHint={tutorHint} />
          )}
          {practiceQuestions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              result={results[q.id]}
              onSelect={(i) => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
              confidence={confidences[q.id]}
              onConfidence={(v) => setConfidences((prev) => ({ ...prev, [q.id]: v }))}
              voice
            />
          ))}
          {practiceQuestions.some((q) => !results[q.id]) ? (
            <Button
              onClick={handleSubmitPractice}
              disabled={
                submittingPractice ||
                practiceQuestions.some((q) => confidences[q.id] === undefined)
              }
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
