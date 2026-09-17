"use client";

import { useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useInView } from "@/lib/visualization/useInView";
import { useWebGLSupport } from "@/lib/visualization/useWebGLSupport";

// Shared chrome for every 3D mode besides the knowledge constellation
// (which owns its own, richer version of this same pattern since it also
// needs per-node hover/list behavior): lazy-mounts the scene once visible,
// skips straight to the static fallback when WebGL is unavailable, and
// gives every mode the same Pause control and reduced-motion default.
export default function VisualizationFrame({
  title,
  caption,
  renderScene,
  renderFallback,
  className = "",
}: {
  title: string;
  caption?: string;
  renderScene: (props: { paused: boolean }) => React.ReactNode;
  renderFallback: () => React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(reducedMotion);
  const webglOk = useWebGLSupport();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {title}
        </h2>
        {webglOk && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {paused ? "Resume motion" : "Pause motion"}
          </button>
        )}
      </div>
      <div
        ref={ref}
        className={`relative h-64 w-full overflow-hidden rounded-[16px_6px_16px_6px] border border-line bg-surface sm:h-72 ${className}`}
      >
        {webglOk ? inView && renderScene({ paused: paused || reducedMotion }) : renderFallback()}
      </div>
      {caption && <p className="text-xs text-ink-muted">{caption}</p>}
    </div>
  );
}
