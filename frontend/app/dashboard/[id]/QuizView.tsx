"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Concept = { id: string; name: string };
type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Mastery = { concept_id: string; mastery_score: number };

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
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [latestMastery, setLatestMastery] = useState<Mastery[] | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[] | null>(
    null,
  );
  const [practicing, setPracticing] = useState(false);
  const [submittingPractice, setSubmittingPractice] = useState(false);

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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setPracticeQuestions(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmittingPractice(false);
    }
  }

  const masteryByConcept = new Map(
    (latestMastery ?? mastery).map((m) => [m.concept_id, m.mastery_score]),
  );

  if (status === "uploaded" || status === "processing") {
    return (
      <p className="text-sm text-gray-500">
        Still processing this document — check back in a moment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {concepts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">Concepts</h2>
          {concepts.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <span>{c.name}</span>
              <span className="text-sm text-gray-500">
                {masteryByConcept.get(c.id) ?? 0}% mastery
              </span>
            </div>
          ))}
        </div>
      )}

      {status === "processed" && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 w-fit"
        >
          {generating ? "Generating quiz..." : "Generate diagnostic quiz"}
        </button>
      )}

      {status === "quiz_ready" && questions.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="font-semibold">Diagnostic quiz</h2>
          {questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <p>{q.question_text}</p>
              {q.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: i }))
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 w-fit"
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm underline w-fit"
          >
            {generating ? "Regenerating..." : "Regenerate quiz"}
          </button>
        </div>
      )}

      {status === "quiz_ready" && !practiceQuestions && (
        <button
          onClick={handlePractice}
          disabled={practicing}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 w-fit"
        >
          {practicing ? "Generating practice..." : "Practice weak concepts"}
        </button>
      )}

      {practiceQuestions && (
        <div className="flex flex-col gap-6">
          <h2 className="font-semibold">Practice session</h2>
          {practiceQuestions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <p>{q.question_text}</p>
              {q.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: i }))
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button
            onClick={handleSubmitPractice}
            disabled={submittingPractice}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 w-fit"
          >
            {submittingPractice ? "Submitting..." : "Submit answers"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
