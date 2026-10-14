"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopicVisualization from "@/components/visualization/TopicVisualization";
import { fetchConceptGuide, type ConceptGuide } from "@/lib/conceptGuide";
import { ConceptFocusProvider } from "@/lib/conceptFocus";
import { extractKeyIdea } from "@/lib/extractKeyIdea";
import { recommendedStep, type MaterialStep } from "@/lib/learningJourney";
import { ConceptMobileSelect, ConceptRail, type RailConcept } from "./ConceptRail";
import NotesDrawer from "./NotesDrawer";

export type WorkspaceConcept = RailConcept & {
  summary: string | null;
  excerpt: string | null;
};

type Tab = { id: string; label: string; content: React.ReactNode };

const CIRCLED = ["①", "②", "③", "④", "⑤"];
// Phone-width names, so the four steps fit on one row.
const SHORT_LABEL: Record<string, string> = { "study-guide": "Guide", flashcards: "Cards" };

// One material, one path: a step bar (Quiz → Study guide → Practice →
// Flashcards, with the Tutor always beside it) that shows the chosen step
// right here, with the concept list beside it. The step to highlight comes
// from the current concept's real mastery (lib/learningJourney.ts).
export default function MaterialWorkspace({
  documentId,
  filename,
  initialConceptId,
  initialStep,
  quizReady = true,
  concepts,
  tabs,
}: {
  documentId: string;
  filename: string;
  initialConceptId?: string;
  initialStep?: string;
  quizReady?: boolean;
  concepts: WorkspaceConcept[];
  tabs: Tab[];
}) {
  const currentId = useMemo(() => {
    const notMastered = concepts.find((c) => (c.mastery ?? 0) < 80);
    return (notMastered ?? concepts[0])?.id ?? null;
  }, [concepts]);

  const steps = tabs.filter((t) => t.id !== "tutor");
  const tutor = tabs.find((t) => t.id === "tutor");
  const current = concepts.find((c) => c.id === currentId) ?? null;
  const allMastered = concepts.length > 0 && concepts.every((c) => (c.mastery ?? 0) >= 80);
  const suggested: MaterialStep = allMastered
    ? "flashcards"
    : recommendedStep({ quizReady, mastery: current?.mastery ?? null });
  const recommendedId = steps.some((s) => s.id === suggested) ? suggested : steps[0]?.id;

  const [selectedId, setSelectedId] = useState(() =>
    concepts.some((c) => c.id === initialConceptId) ? initialConceptId : currentId ?? concepts[0]?.id,
  );
  const [activeId, setActiveId] = useState(() =>
    tabs.some((t) => t.id === initialStep) ? initialStep! : recommendedId,
  );
  const [showVisual, setShowVisual] = useState(false);
  const [showMore, setShowMore] = useState(false);
  // Explanations written after this page loaded (see lib/conceptGuide.ts).
  const [guides, setGuides] = useState<Record<string, ConceptGuide | "failed">>({});

  const selected = concepts.find((c) => c.id === selectedId) ?? concepts[0];
  const fetched = selected ? guides[selected.id] : undefined;
  const loadedGuide = fetched && fetched !== "failed" ? fetched : null;
  const summary = selected?.summary ?? loadedGuide?.summary ?? null;
  const keyIdea = selected ? extractKeyIdea(summary, selected.excerpt ?? loadedGuide?.excerpt ?? null) : null;
  const needsGuide = !!selected && !selected.summary && !selected.excerpt;
  const preparingKeyIdea = needsGuide && fetched === undefined;
  const focus = useMemo(
    () => (selected ? { id: selected.id, name: selected.name } : null),
    [selected],
  );

  // A concept's explanation (and so its key idea) is only written the first
  // time something asks for it - so ask as soon as it's on screen, instead
  // of leaving the card empty until the Study guide happens to.
  useEffect(() => {
    if (!needsGuide || !selected || guides[selected.id] !== undefined) return;
    const id = selected.id;
    fetchConceptGuide(documentId, id).then(
      (guide) => setGuides((prev) => ({ ...prev, [id]: guide })),
      () => setGuides((prev) => ({ ...prev, [id]: "failed" })),
    );
  }, [documentId, needsGuide, selected, guides]);
  const active = tabs.find((t) => t.id === activeId) ?? steps[0];

  const masteryByConceptId = useMemo(
    () => new Map(concepts.map((c) => [c.id, c.mastery] as const).filter((e): e is [string, number] => e[1] !== null)),
    [concepts],
  );

  if (!selected) return null;

  return (
    <div className="syn-workspace flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <nav aria-label="Steps for this material" className="syn-steps">
          <ol className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {steps.map((step, i) => {
              const isActive = step.id === active?.id;
              const isNext = step.id === recommendedId;
              return (
                <li key={step.id} className="flex min-w-0 items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden className="hidden text-ink-muted sm:inline">
                      &rarr;
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveId(step.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={`syn-step ${isActive ? "syn-step-active" : ""} ${isNext ? "syn-step-next" : ""}`}
                  >
                    <span aria-hidden>{CIRCLED[i]}</span>{" "}
                    <span className="sm:hidden" aria-hidden>{SHORT_LABEL[step.id] ?? step.label}</span>
                    <span className="max-sm:sr-only">{step.label}</span>
                    {isNext && <span className="syn-step-badge">Next</span>}
                  </button>
                </li>
              );
            })}
            {tutor && (
              <li className="col-span-4 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => setActiveId("tutor")}
                  aria-current={active?.id === "tutor" ? "step" : undefined}
                  className={`syn-step syn-step-tutor ${active?.id === "tutor" ? "syn-step-active" : ""}`}
                >
                  Ask the Tutor
                </button>
              </li>
            )}
          </ol>
        </nav>
        <NotesDrawer documentId={documentId} />
      </div>

      <div className="grid grid-cols-1 gap-y-6 xl:grid-cols-[210px_minmax(0,1fr)] xl:items-start xl:gap-x-10">
        <div className="min-w-0 xl:sticky xl:top-20">
          <ConceptRail
            concepts={concepts}
            currentId={currentId}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <ConceptMobileSelect
            concepts={concepts}
            currentId={currentId}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />

          {/* The concept in focus, kept short so the step itself is right below. */}
          <section key={selected.id} className="syn-concept-card flex min-w-0 animate-fade-up flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="syn-concept-title">{selected.name}</h2>
              <span className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      selected.mastery === null ? "var(--line)" : "var(--mastered)",
                    opacity: selected.mastery === null ? 1 : Math.max(0.35, selected.mastery / 100),
                  }}
                />
                {selected.mastery === null ? "Not yet attempted" : `${selected.mastery}% mastery`}
              </span>
            </div>
            {preparingKeyIdea && (
              <p className="text-sm text-ink-muted" aria-live="polite">
                Preparing the key idea...
              </p>
            )}
            {keyIdea && (
              <p
                className="max-w-2xl text-lg leading-relaxed text-ink"
                style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic" }}
              >
                {"“"}
                {keyIdea}
                {"”"}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {summary && summary.trim() !== keyIdea && (
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={showMore}
                  className="w-fit text-sm font-medium text-ink-muted hover:text-ink"
                >
                  {showMore ? "Less about this concept" : "More about this concept"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowVisual((v) => !v)}
                aria-expanded={showVisual}
                className="w-fit text-sm font-medium text-ink-muted hover:text-ink"
              >
                {showVisual ? "Hide visual" : "Show visual"}
              </button>
            </div>
            {showMore && summary && (
              <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{summary}</p>
            )}
            {showVisual && (
              <div className="syn-visual-stage min-w-0">
                <TopicVisualization
                  documentId={documentId}
                  filename={filename}
                  concepts={concepts}
                  masteryByConceptId={masteryByConceptId}
                  selectedConceptId={selected.id}
                />
              </div>
            )}
          </section>

          <section aria-label={active?.label} key={active?.id} className="animate-fade-up">
            {active?.id === "tutor" && (
              <p className="mb-4 text-sm text-ink-muted">
                The Tutor answers only from this material.{" "}
                <Link href="/dashboard/ask" className="font-medium text-ink underline-offset-2 hover:underline">
                  General questions (not from your notes) &rarr;
                </Link>
              </p>
            )}
            <ConceptFocusProvider value={focus}>{active?.content}</ConceptFocusProvider>
          </section>
        </div>
      </div>
    </div>
  );
}
