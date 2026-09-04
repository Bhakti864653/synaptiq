"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import TrendChart from "@/components/TrendChart";
import { friendlyErrorMessage } from "@/lib/friendlyError";

type HistoryPoint = { date: string; mastery_score: number };

export default function ConceptMasteryHistory({ conceptId }: { conceptId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (points !== null) return; // already loaded once this session
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/concepts/${conceptId}/mastery-history`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const result = await res.json();
      setPoints(result.points);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleToggle}
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
