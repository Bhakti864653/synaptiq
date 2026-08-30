"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";

type CardData = { id: string; front: string; back: string };

export default function Flashcards({ documentId }: { documentId: string }) {
  const [generating, setGenerating] = useState(false);
  const [loadingDue, setLoadingDue] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [dueCards, setDueCards] = useState<CardData[] | null>(null);
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
      <h2 className="text-lg font-semibold text-ink">Flashcards</h2>

      {!dueCards && (
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} className="w-fit">
            {generating ? "Generating..." : "Generate flashcards"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleLoadDue}
            disabled={loadingDue}
            className="w-fit"
          >
            {loadingDue ? "Loading..." : "Review due cards"}
          </Button>
        </div>
      )}

      {dueCards && currentCard && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-sm text-ink-muted">
            Card {index + 1} of {dueCards.length}
          </p>
          <Card className="flex min-h-24 items-center justify-center p-6 text-center text-ink">
            {revealed ? currentCard.back : currentCard.front}
          </Card>
          {!revealed ? (
            <Button onClick={() => setRevealed(true)} className="w-fit">
              Show answer
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleReview("again")}
                disabled={reviewing}
              >
                Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleReview("good")}
                disabled={reviewing}
              >
                Good
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleReview("easy")}
                disabled={reviewing}
              >
                Easy
              </Button>
            </div>
          )}
        </div>
      )}

      {dueCards && !currentCard && (
        <p className="text-sm text-ink-muted">
          No cards due right now — check back later, or generate a fresh set.
        </p>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
