"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/Button";
import TopicVisualization from "@/components/visualization/TopicVisualization";
import { extractKeyIdea } from "@/lib/extractKeyIdea";
import { ConceptMobileSelect, ConceptRail, type RailConcept } from "./ConceptRail";
import LearningJourneyBar from "./LearningJourneyBar";
import DocumentTabs from "./DocumentTabs";
import NotesDrawer from "./NotesDrawer";

export type WorkspaceConcept = RailConcept & {
  summary: string | null;
  excerpt: string | null;
};

type Tab = { id: string; label: string; content: React.ReactNode };

export default function MaterialWorkspace({
  documentId,
  filename,
  concepts,
  tabs,
}: {
  documentId: string;
  filename: string;
  concepts: WorkspaceConcept[];
  tabs: Tab[];
}) {
  const currentId = useMemo(() => {
    const notMastered = concepts.find((c) => (c.mastery ?? 0) < 80);
    return (notMastered ?? concepts[0])?.id ?? null;
  }, [concepts]);

  const [selectedId, setSelectedId] = useState(currentId ?? concepts[0]?.id);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);
  const tabsRef = useRef<HTMLDivElement>(null);

  const selected = concepts.find((c) => c.id === selectedId) ?? concepts[0];
  const keyIdea = selected ? extractKeyIdea(selected.summary, selected.excerpt) : null;
  const hasTutorTab = tabs.some((t) => t.id === "tutor");

  const masteryByConceptId = useMemo(
    () => new Map(concepts.map((c) => [c.id, c.mastery] as const).filter((e): e is [string, number] => e[1] !== null)),
    [concepts],
  );

  function goToTab(id: string) {
    setActiveTabId(id);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selected) return null;

  return (
    <div className="syn-workspace flex flex-col gap-12">
      {/* The concept rail stays narrow, while the explanation and live
          visualization share the remaining room. At smaller widths these
          follow the same reading order in one column. */}
      <div className="grid grid-cols-1 gap-y-8 xl:grid-cols-[210px_minmax(0,1fr)] xl:items-start xl:gap-x-10">
        <div className="syn-concept-sidebar min-w-0 xl:sticky xl:top-20">
          <div className="syn-eyebrow hidden xl:block">Concept index / {concepts.length}</div>
          <ConceptRail
            concepts={concepts}
            currentId={currentId}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        </div>

        <div className="min-w-0">
          <ConceptMobileSelect
            concepts={concepts}
            currentId={currentId}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />

          <div className="syn-concept-stage mt-6 grid min-w-0 grid-cols-1 xl:mt-0 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-center">
          {/* The selected concept remains the reading focus. Switching it
              updates the existing live visualization beside it. */}
          <section key={selected.id} className="syn-concept-copy flex min-w-0 animate-fade-up flex-col gap-4">
            <span className="syn-eyebrow">The idea / {String(concepts.findIndex((c) => c.id === selected.id) + 1).padStart(2, "0")}</span>
            <h2 className="syn-concept-title">
              {selected.name}
            </h2>
            {keyIdea && (
              <p
                className="max-w-xl text-xl leading-relaxed text-ink"
                style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic" }}
              >
                {"“"}
                {keyIdea}
                {"”"}
              </p>
            )}
            {selected.summary && selected.summary.trim() !== keyIdea && (
              <p className="max-w-xl text-sm leading-relaxed text-ink-muted">{selected.summary}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-ink-muted">
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
            </div>

            <div className="flex items-center gap-4">
              <Button variant="primary" onClick={() => goToTab("quiz")}>
                {(selected.mastery ?? 0) > 0 ? "Continue practicing" : "Start practicing"}
              </Button>
              {hasTutorTab && (
                <button
                  type="button"
                  onClick={() => goToTab("tutor")}
                  className="text-sm font-medium text-ink-muted hover:text-ink"
                >
                  Ask Synaptiq about this &rarr;
                </button>
              )}
            </div>

            {/* Quiet and secondary on purpose - see LearningJourneyBar. */}
            <LearningJourneyBar mastery={selected.mastery} />
          </section>

          <div className="syn-visual-stage min-w-0">
            <TopicVisualization
              documentId={documentId}
              filename={filename}
              concepts={concepts}
              masteryByConceptId={masteryByConceptId}
              selectedConceptId={selected.id}
            />
          </div>
          </div>
        </div>
      </div>

      <div className="syn-practice-section flex flex-col gap-8">
        <div ref={tabsRef}>
          <span className="syn-eyebrow">02 / Make it stick</span>
          <h2 className="syn-section-title mb-6">Practice <em>& review.</em></h2>
          <DocumentTabs tabs={tabs} activeId={activeTabId} onActiveChange={setActiveTabId} />
        </div>

        <NotesDrawer documentId={documentId} />
      </div>
    </div>
  );
}
