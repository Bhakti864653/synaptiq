"use client";

import { masteryColorVar } from "@/lib/mastery";

export type RailConcept = {
  id: string;
  name: string;
  mastery: number | null;
};

function statusFor(concept: RailConcept, currentId: string | null): "completed" | "current" | "upcoming" {
  if ((concept.mastery ?? 0) >= 80) return "completed";
  if (concept.id === currentId) return "current";
  return "upcoming";
}

// Desktop rail: a real, selectable list (buttons, not decoration) -
// selecting one updates the workspace's central focus. Completed/current/
// upcoming come from each concept's own real mastery score plus which one
// is naturally "next" (first not-yet-mastered concept in order), not a
// fabricated progression.
export function ConceptRail({
  concepts,
  currentId,
  selectedId,
  onSelect,
}: {
  concepts: RailConcept[];
  currentId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Concepts in this material" className="hidden xl:block">
      <ul className="flex flex-col gap-0.5 border-l border-line pl-3">
        {concepts.map((concept) => {
          const status = statusFor(concept, currentId);
          const selected = concept.id === selectedId;
          return (
            <li key={concept.id}>
              <button
                type="button"
                onClick={() => onSelect(concept.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selected ? "bg-brand/10 text-ink" : "text-ink-muted hover:bg-line/40 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      concept.mastery === null ? "var(--line)" : masteryColorVar(concept.mastery),
                  }}
                />
                <span className="min-w-0 flex-1 truncate">{concept.name}</span>
                {status === "completed" && (
                  <span aria-hidden className="shrink-0 text-xs text-[var(--mastered)]">
                    {"✓"}
                  </span>
                )}
                {status === "current" && (
                  <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">
                    Now
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Mobile equivalent - a native <select> is a genuinely accessible compact
// selector on small screens (keyboard/screen-reader support comes for
// free), rather than a custom drawer component to build and maintain.
export function ConceptMobileSelect({
  concepts,
  currentId,
  selectedId,
  onSelect,
}: {
  concepts: RailConcept[];
  currentId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 xl:hidden">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Jump to concept
      </span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      >
        {concepts.map((concept) => {
          const status = statusFor(concept, currentId);
          const suffix = status === "completed" ? " ✓" : status === "current" ? " (now)" : "";
          return (
            <option key={concept.id} value={concept.id}>
              {concept.name}
              {suffix}
            </option>
          );
        })}
      </select>
    </label>
  );
}
