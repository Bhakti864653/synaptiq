"use client";

import { useEffect, useState } from "react";
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
  activeLabel,
  caption,
  ariaLabel,
  renderScene,
  renderFallback,
  listView,
  extraControls,
  className = "",
}: {
  title: string;
  // A short, real, currently-true label (e.g. the focused concept's name)
  // shown beside the title - never a static placeholder, omitted entirely
  // when there's nothing specific to say.
  activeLabel?: string | null;
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

  // react-three-fiber's own container-size measurement can miss its first
  // reading on a dynamically-imported, lazily-mounted Canvas (live-verified:
  // the canvas got stuck at the raw <canvas> 300x150 default even though its
  // parent was correctly sized, and only a genuine window "resize" event
  // afterward made it pick up the real size). A single nudge right after
  // this component's own mount is too early - the scene itself is a
  // next/dynamic(ssr:false) import that hasn't finished loading yet at that
  // point - so this retries a few times over the following second, which
  // reliably lands after the real canvas exists without depending on any
  // exact timing.
  useEffect(() => {
    if (!inView || !webglOk) return;
    const delays = [50, 150, 300, 600, 1000];
    const ids = delays.map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event("resize")), ms),
    );
    return () => ids.forEach(clearTimeout);
  }, [inView, webglOk]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {title}
          </h2>
          {activeLabel && (
            <span
              key={activeLabel}
              className="animate-fade-up text-sm font-medium text-brand"
            >
              {activeLabel}
            </span>
          )}
        </div>
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
      {/* `isolate` gives this its own stacking context, so the glow's
          negative z-index can never escape and render behind unrelated
          content elsewhere on the page - plain non-positioned content
          already paints above a negative-z-index absolute sibling within
          the same context, so no extra wrapper is needed for that.
          Deliberately NOT wrapping the scene content in its own div -
          react-three-fiber's <Canvas> measures its immediate parent's
          size on mount, and an extra nesting level here was found (live-
          verified) to make it measure the wrong element and fall back to
          a raw <canvas>'s 300x150 default, rendering nothing visible. No
          hard rectangular border either - the glow reads the
          visualization as part of the paper surface, not a widget. */}
      <div
        ref={ref}
        className={`relative isolate h-64 w-full overflow-hidden rounded-2xl sm:h-80 lg:h-[420px] ${className}`}
        aria-label={ariaLabel}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 25% 25%, color-mix(in srgb, var(--accent-2) 24%, transparent), transparent 70%), radial-gradient(55% 55% at 80% 75%, color-mix(in srgb, #8b6bff 20%, transparent), transparent 70%)",
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
