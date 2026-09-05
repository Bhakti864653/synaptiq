"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import TopicBody, { type TopicConcept } from "./TopicBody";

type Concept = TopicConcept & { order_index: number; scheduled_date: string | null };
type Mastery = { concept_id: string; mastery_score: number };

const PASS_THRESHOLD = 80;

function todayUtc(): string {
  // Matches the backend's existing UTC "today" convention (build_study_plan
  // uses datetime.now(timezone.utc).date()) so scheduled_date comparisons
  // line up without extra plumbing - toISOString() is always UTC.
  return new Date().toISOString().slice(0, 10);
}

// Surfaces the Study Guide's existing per-topic content (guide + excerpt +
// quiz, via TopicBody) day-by-day instead of making the user hunt for it in
// the topic list below. "Today" is derived entirely from data already on
// hand (concepts' scheduled_date + mastery) - no separate endpoint.
export default function DailyPlan({
  documentId,
  concepts,
  mastery,
}: {
  documentId: string;
  concepts: Concept[];
  mastery: Mastery[];
}) {
  const masteryByConcept = new Map(
    mastery.map((m) => [m.concept_id, m.mastery_score]),
  );
  const hasPlan = concepts.some((c) => c.scheduled_date !== null);
  const today = todayUtc();

  // <= today (not ===) so a skipped day's topics roll forward into today
  // automatically instead of being stranded in the past.
  const teachingTopics = concepts
    .filter(
      (c) =>
        c.scheduled_date !== null &&
        c.scheduled_date <= today &&
        (masteryByConcept.get(c.id) ?? 0) < PASS_THRESHOLD,
    )
    .sort(
      (a, b) =>
        (a.scheduled_date as string).localeCompare(b.scheduled_date as string) ||
        a.order_index - b.order_index,
    );

  const revisionTopics = concepts
    .filter((c) => (masteryByConcept.get(c.id) ?? 0) >= PASS_THRESHOLD)
    .sort((a, b) => a.order_index - b.order_index);

  const mode: "teaching" | "revision" | "none" =
    teachingTopics.length > 0 ? "teaching" : hasPlan ? "revision" : "none";
  const topics = mode === "teaching" ? teachingTopics : revisionTopics;

  const [index, setIndex] = useState(0);

  if (mode === "none" || topics.length === 0) return null;

  const title = mode === "teaching" ? "Today's plan" : "Revision day";

  if (index >= topics.length) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-muted">
          You&apos;re done for now — nice work.
        </p>
      </Card>
    );
  }

  const concept = topics[index];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {topics.length > 1 && (
          <span className="text-xs text-ink-muted">
            Topic {index + 1} of {topics.length}
          </span>
        )}
      </div>
      {mode === "revision" && (
        <p className="text-xs text-ink-muted">
          Nothing new scheduled today — here&apos;s a review of what you&apos;ve
          already covered.
        </p>
      )}
      <TopicBody
        key={concept.id}
        documentId={documentId}
        concept={concept}
        onAdvance={() => setIndex((i) => i + 1)}
      />
      <Button
        variant="ghost"
        onClick={() => setIndex((i) => i + 1)}
        className="w-fit px-0"
      >
        Skip to next topic
      </Button>
    </Card>
  );
}
