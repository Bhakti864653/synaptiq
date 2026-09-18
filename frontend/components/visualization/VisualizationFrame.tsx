"use client";

import { useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useInView } from "@/lib/visualization/useInView";
import { useWebGLSupport } from "@/lib/visualization/useWebGLSupport";

// Shared chrome for every 3D mode besides the knowledge constellation
// (which owns its own, richer version of this same pattern since it also
// needs per-node hover/list behavior): lazy-mounts the scene once visible,
// skips straight to the static fallback when WebGL is unavailable, gives
// every mode the same Pause control and reduced-motion default, and (when
// `listView` is supplied) the same "View as list" toggle every mode needs
// as its real keyboard-accessible alternative - not just a WebGL fallback,
// available regardless of WebGL support.
export default function VisualizationFrame({
  title,
  caption,
  ariaLabel,
  renderScene,
  renderFallback,
  listView,
  extraControls,
  className = "",
}: {
  title: string;
  caption?: string;
  ariaLabel?: string;
  renderScene: (props: { paused: boolean }) => React.ReactNode;
  renderFallback: () => React.ReactNode;
  listView?: React.ReactNode;
  extraControls?: (props: { paused: boolean; showList: boolean }) => React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(reducedMotion);
  const [showList, setShowList] = useState(false);
  const webglOk = useWebGLSupport();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {title}
        </h2>
        <div className="flex items-center gap-3 text-xs">
          {extraControls?.({ paused, showList })}
          {webglOk && !showList && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {paused ? "Resume motion" : "Pause motion"}
            </button>
          )}
          {listView && (
            <button
              type="button"
              onClick={() => setShowList((s) => !s)}
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {showList ? "View as scene" : "View as list"}
            </button>
          )}
        </div>
      </div>
      {/* No hard rectangular border - a soft atmospheric glow instead, so
          every mode reads as part of the paper surface rather than another
          bordered widget stacked on the page. */}
      <div
        ref={ref}
        className={`relative h-64 w-full overflow-hidden rounded-2xl sm:h-72 ${className}`}
        aria-label={ariaLabel}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 25% 25%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 70%), radial-gradient(50% 50% at 80% 75%, color-mix(in srgb, #8b6bff 14%, transparent), transparent 70%)",
          }}
        />
        {showList && listView
          ? listView
          : webglOk
            ? inView && renderScene({ paused: paused || reducedMotion })
            : renderFallback()}
      </div>
      {caption && <p className="text-xs text-ink-muted">{caption}</p>}
    </div>
  );
}
