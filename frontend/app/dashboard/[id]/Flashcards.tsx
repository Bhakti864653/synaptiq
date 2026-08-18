"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";

type Card = { id: string; front: string; back: string };

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

export default function Flashcards({ documentId }: { documentId: string }) {
  const [generating, setGenerating] = useState(false);
  const [loadingDue, setLoadingDue] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [dueCards, setDueCards] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/flashcards/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      await handleLoadDue();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleGenerate });
    } finally {
      setGenerating(false);
    }
  }

  async function handleLoadDue() {
    setLoadingDue(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/flashcards/due`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const result = await res.json();
      setDueCards(result.cards);
      setIndex(0);
      setRevealed(false);
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleLoadDue });
    } finally {
      setLoadingDue(false);
    }
  }

  async function handleReview(quality: "again" | "good" | "easy") {
    if (!dueCards) return;
    const card = dueCards[index];
    setReviewing(true);
    setError(null);
    try {
      const res = await authFetch(`/flashcards/${card.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      setRevealed(false);
      setIndex((i) => i + 1);
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: () => handleReview(quality),
      });
    } finally {
      setReviewing(false);
    }
  }

  const currentCard = dueCards?.[index];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold">Flashcards</h2>

      {!dueCards && (
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50 w-fit"
          >
            {generating ? "Generating..." : "Generate flashcards"}
          </button>
          <button
            onClick={handleLoadDue}
            disabled={loadingDue}
            className="rounded border px-3 py-2 w-fit"
          >
            {loadingDue ? "Loading..." : "Review due cards"}
          </button>
        </div>
      )}

      {dueCards && currentCard && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">
            Card {index + 1} of {dueCards.length}
          </p>
          <div className="rounded border p-6 text-center min-h-24 flex items-center justify-center">
            {revealed ? currentCard.back : currentCard.front}
          </div>
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="rounded bg-black px-3 py-2 text-white w-fit"
            >
              Show answer
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleReview("again")}
                disabled={reviewing}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Again
              </button>
              <button
                onClick={() => handleReview("good")}
                disabled={reviewing}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Good
              </button>
              <button
                onClick={() => handleReview("easy")}
                disabled={reviewing}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Easy
              </button>
            </div>
          )}
        </div>
      )}

      {dueCards && !currentCard && (
        <p className="text-sm text-gray-500">
          No cards due right now — check back later, or generate a fresh set.
        </p>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
