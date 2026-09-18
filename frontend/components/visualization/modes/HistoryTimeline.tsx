"use client";

import { useState } from "react";
import type { HistoryEvent } from "@/lib/visualization/extractHistoryDates";

// A real timeline, not a 3D scene pretending to be one - a linear
// sequence of real dates is naturally a 2D/HTML structure, and every
// point here is a genuine year found in the material's own text (see
// lib/visualization/extractHistoryDates.ts), never invented.
export default function HistoryTimeline({
  events,
  focusedConceptIndex,
}: {
  events: HistoryEvent[];
  // Set from the material workspace's concept rail - highlights the
  // matching point without the user having hovered/tabbed to it.
  focusedConceptIndex?: number | null;
}) {
  const [localActiveIndex, setLocalActiveIndex] = useState<number | null>(null);
  const externalActiveIndex =
    focusedConceptIndex != null
      ? events.findIndex((e) => e.conceptIndex === focusedConceptIndex)
      : -1;
  const activeIndex = localActiveIndex ?? (externalActiveIndex >= 0 ? externalActiveIndex : null);
  const minYear = events[0].year;
  const maxYear = events[events.length - 1].year;
  const span = Math.max(1, maxYear - minYear);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Timeline
      </h2>
      <p className="text-xs text-ink-muted">
        Built from the real years mentioned in this material - {events.length} dated concept
        {events.length === 1 ? "" : "s"}.
      </p>
      {/* `isolate` gives this its own stacking context so the glow's z-0
          layer can never render behind unrelated page content. */}
      <div className="relative isolate overflow-x-auto rounded-2xl py-10 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 z-0"
          style={{
            background:
              "radial-gradient(50% 50% at 20% 50%, color-mix(in srgb, var(--accent-2) 22%, transparent), transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-6 h-px min-w-[480px] bg-line">
          {events.map((event, i) => {
            const pct = ((event.year - minYear) / span) * 100;
            const active = activeIndex === i;
            return (
              <div
                key={i}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                <button
                  type="button"
                  onFocus={() => setLocalActiveIndex(i)}
                  onBlur={() => setLocalActiveIndex(null)}
                  onMouseEnter={() => setLocalActiveIndex(i)}
                  onMouseLeave={() => setLocalActiveIndex(null)}
                  aria-label={`${event.label}, ${event.year}`}
                  className="block h-3 w-3 -translate-y-1/2 rounded-full border-2 border-paper bg-brand transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  style={{ transform: active ? "translateY(-50%) scale(1.3)" : "translateY(-50%)" }}
                />
                <div
                  className={`absolute left-1/2 top-4 w-max max-w-[10rem] -translate-x-1/2 text-center text-xs transition-opacity ${
                    active ? "opacity-100" : "opacity-70"
                  }`}
                >
                  <div className="font-mono font-semibold text-ink">{event.year}</div>
                  <div className="text-ink-muted">{event.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
