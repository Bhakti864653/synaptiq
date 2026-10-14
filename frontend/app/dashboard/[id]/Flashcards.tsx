"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useConceptFocus } from "@/lib/conceptFocus";

type CardData = { id: string; concept_id?: string | null; front: string; back: string };

export default function Flashcards({ documentId }: { documentId: string }) {
  const [generating, setGenerating] = useState(false);
  const [loadingDue, setLoadingDue] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [dueCards, setDueCards] = useState<CardData[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  // On the material page, review the picked concept's cards (when it has
  // any due), with a way to review every due card instead.
  const focus = useConceptFocus();
  const [allCardsFor, setAllCardsFor] = useState<string | null>(null);
  const focusCards = focus && dueCards ? dueCards.filter((c) => c.concept_id === focus.id) : [];
  const narrowed =
    !!focus && !!dueCards && focusCards.length > 0 && focusCards.length < dueCards.length &&
    allCardsFor !== focus.id;
  const shownCards = narrowed ? focusCards : dueCards;

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
      setRevealed(false);
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: handleLoadDue });
    } finally {
      setLoadingDue(false);
    }
  }

  async function handleReview(quality: "again" | "good" | "easy") {
    if (!shownCards) return;
    const card = shownCards[0];
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
      // Reviewed cards leave the due list, so switching between this
      // concept's cards and all cards never repeats one.
      setDueCards((prev) => prev?.filter((c) => c.id !== card.id) ?? null);
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: () => handleReview(quality),
      });
    } finally {
      setReviewing(false);
    }
  }

  const currentCard = shownCards?.[0];

  function switchCards(showAll: boolean) {
    setAllCardsFor(showAll && focus ? focus.id : null);
    setRevealed(false);
  }

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
          {focus && focusCards.length === 0 && (
            <p className="text-sm text-ink-muted">
              No cards due for {focus.name} right now, so here are all your due cards.
            </p>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-mono text-sm text-ink-muted">
              {narrowed && focus ? `${focus.name}: ` : ""}{shownCards?.length} card{shownCards?.length === 1 ? "" : "s"} due
            </p>
            {focus && focusCards.length > 0 && focusCards.length < dueCards.length && (
              <button
                type="button"
                onClick={() => switchCards(narrowed)}
                className="text-sm font-medium text-ink-muted hover:text-ink"
              >
                {narrowed ? `Review all ${dueCards.length} due cards` : `Only ${focus.name}`}
              </button>
            )}
          </div>
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

      {dueCards && dueCards.length === 0 && (
        <p className="text-sm text-ink-muted">
          No cards due right now — check back later, or generate a fresh set.
        </p>
      )}

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
