"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/Button";
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
  concepts,
  visualization,
  tabs,
}: {
  documentId: string;
  concepts: WorkspaceConcept[];
  visualization: React.ReactNode;
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

  function goToTab(id: string) {
    setActiveTabId(id);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selected) return null;

  return (
    // min-w-0 on both grid items - without it, CSS Grid's default
    // min-width:auto lets the visualization's own wide content force the
    // whole track (and the page) wider than the viewport on narrow
    // screens, even inside a single-column grid.
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
      <div className="min-w-0">
        <ConceptRail
          concepts={concepts}
          currentId={currentId}
          selectedId={selected.id}
          onSelect={setSelectedId}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <ConceptMobileSelect
          concepts={concepts}
          currentId={currentId}
          selectedId={selected.id}
          onSelect={setSelectedId}
        />

        {/* Central focus - one concept at a time, hierarchy and spacing
            instead of another bordered card. */}
        <section className="flex flex-col gap-3">
          <h2
            className="text-2xl font-medium text-ink"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {selected.name}
          </h2>
          {keyIdea && (
            <p className="border-l-2 border-brand/40 pl-3 text-base leading-relaxed text-ink">
              {keyIdea}
            </p>
          )}
          {selected.summary && selected.summary.trim() !== keyIdea && (
            <p className="text-sm leading-relaxed text-ink-muted">{selected.summary}</p>
          )}
          <LearningJourneyBar mastery={selected.mastery} />
          <div className="mt-1 flex items-center gap-3">
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
        </section>

        {visualization}

        <div ref={tabsRef}>
          <DocumentTabs tabs={tabs} activeId={activeTabId} onActiveChange={setActiveTabId} />
        </div>

        <NotesDrawer documentId={documentId} />
      </div>
    </div>
  );
}
