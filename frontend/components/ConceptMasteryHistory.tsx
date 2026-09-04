"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import TrendChart from "@/components/TrendChart";
import { friendlyErrorMessage } from "@/lib/friendlyError";

type HistoryPoint = { date: string; mastery_score: number };

export default function ConceptMasteryHistory({
  conceptId,
  masteryScore,
}: {
  conceptId: string;
  masteryScore: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);
  const [loadedForScore, setLoadedForScore] = useState<number | null>(null);

  // Refetches whenever the panel is open and the concept's live mastery
  // score (passed down from the latest quiz-submit response) has moved
  // since the last fetch - not just once ever - so answering more
  // questions while this is open, or reopening it later, shows the new
  // history instead of a stale cached one.
  useEffect(() => {
    if (!open || loadedForScore === masteryScore) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/concepts/${conceptId}/mastery-history`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Failed (${res.status})`);
        }
        const result = await res.json();
        if (cancelled) return;
        setPoints(result.points);
        setLoadedForScore(masteryScore);
      } catch (e) {
        if (!cancelled) setError(friendlyErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, masteryScore, conceptId, loadedForScore]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-fit text-xs text-ink-muted underline decoration-dotted hover:text-ink"
      >
        {open ? "Hide history" : "View history"}
      </button>
      {open && (
        <>
          {loading && <p className="text-xs text-ink-muted">Loading...</p>}
          {error && <p className="text-xs text-weak">{error}</p>}
          {points && points.length === 0 && (
            <p className="text-xs text-ink-muted">
              No quiz answers yet for this concept.
            </p>
          )}
          {points && points.length > 0 && (
            <TrendChart
              points={points.map((p) => ({ date: p.date, value: p.mastery_score }))}
            />
          )}
        </>
      )}
    </div>
  );
}
