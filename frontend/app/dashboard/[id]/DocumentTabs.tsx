"use client";

import { useState } from "react";

type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

// "Orbit" navigation: modes are peers connected to the same document, not
// numbered/checkmarked steps in a sequence - jumping straight to Flashcards
// without doing Quiz first is normal, not "out of order". The small hub dot
// + connecting lines carry that "all sourced from one place" feeling; the
// active mode gets the full gradient + glow, everything else stays quiet.
export default function DocumentTabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex items-center gap-3 overflow-x-auto pb-1 pl-1"
        role="tablist"
      >
        <div
          aria-hidden
          className="hidden h-8 w-8 shrink-0 rounded-full sm:block"
          style={{ background: "color-mix(in srgb, var(--brand) 35%, transparent)" }}
        />
        {tabs.map((tab, i) => {
          const isActive = tab.id === active?.id;
          return (
            <div key={tab.id} className="flex shrink-0 items-center gap-3">
              {i > 0 && (
                <span aria-hidden className="hidden h-px w-4 shrink-0 bg-line sm:block" />
              )}
              <button
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "scale-105 bg-brand text-brand-ink shadow-[0_8px_20px_-8px_rgba(99,102,241,0.5)]"
                    : "border border-line text-ink-muted hover:border-brand hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            </div>
          );
        })}
      </div>
      <div key={active?.id} className="animate-fade-up">
        {active?.content}
      </div>
    </div>
  );
}
