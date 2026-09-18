"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ConstellationData, ConstellationNode } from "@/lib/visualization/buildConstellationData";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useInView } from "@/lib/visualization/useInView";
import { useWebGLSupport } from "@/lib/visualization/useWebGLSupport";
import ConstellationFallback from "./ConstellationFallback";
import ConstellationListView from "./ConstellationListView";

// The Canvas/scene pulls in three.js + @react-three/fiber, a genuinely
// heavy dependency with no reason to touch SSR (a WebGL context can't
// exist server-side anyway) - ssr:false keeps it fully client-only and out
// of the server bundle entirely.
const ConstellationScene = dynamic(() => import("./Scene"), { ssr: false });

export default function KnowledgeConstellation({
  data,
  title = "Knowledge constellation",
  emptyHint = "Upload a material to see your first concepts appear here.",
  activeLabel,
  focusedConceptId: externalFocusedId,
}: {
  data: ConstellationData;
  title?: string;
  emptyHint?: string;
  // A short, real label shown beside the title (e.g. the currently
  // selected concept's name).
  activeLabel?: string | null;
  // Set from outside (the material workspace's concept rail) to highlight
  // a specific node without the user having hovered/tabbed to it - a
  // real, local hover/keyboard focus still takes priority over this the
  // moment the user actually interacts with the scene themselves.
  focusedConceptId?: string | null;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(reducedMotion);
  const [showList, setShowList] = useState(false);
  const [localFocusedId, setLocalFocusedId] = useState<string | null>(null);
  const webglOk = useWebGLSupport();
  const focusedId = localFocusedId ?? externalFocusedId ?? null;

  // See VisualizationFrame.tsx for why: react-three-fiber's own container-
  // size measurement can miss its first reading on a dynamically-imported,
  // lazily-mounted Canvas, leaving it stuck at the raw <canvas> 300x150
  // default until something nudges a real resize. Retried over the
  // following second rather than nudged once immediately, since the scene
  // itself is a next/dynamic(ssr:false) import that hasn't necessarily
  // finished loading yet on this component's own first mount.
  useEffect(() => {
    if (!inView || !webglOk || data.nodes.length === 0) return;
    const delays = [50, 150, 300, 600, 1000];
    const ids = delays.map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event("resize")), ms),
    );
    return () => ids.forEach(clearTimeout);
  }, [inView, webglOk, data.nodes.length]);

  function handleSelect(node: ConstellationNode) {
    setLocalFocusedId(node.id);
    router.push(`/dashboard/${node.documentId}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {title}
          </h2>
          {activeLabel && (
            <span key={activeLabel} className="animate-fade-up text-sm font-medium text-brand">
              {activeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
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
          <button
            type="button"
            onClick={() => setShowList((s) => !s)}
            className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {showList ? "View as constellation" : "View as list"}
          </button>
        </div>
      </div>

      {/* `isolate` gives this its own stacking context, so the glow's
          negative z-index can never escape and render behind unrelated
          content elsewhere on the page - that's the actual bug the
          isolation is fixing, not the paint order of the glow against its
          own sibling here (plain non-positioned content already paints
          above a negative-z-index absolute sibling within the same
          context, with no extra wrapper needed). Deliberately NOT adding
          an extra wrapping div around the scene content itself - react-
          three-fiber's <Canvas> measures its immediate parent's size on
          mount, and an extra nesting level here was found (live-verified)
          to make it measure the wrong element and fall back to a raw
          <canvas>'s 300x150 default, rendering nothing visible. No hard
          rectangular border either - the glow reads the scene as part of
          the paper surface rather than another bordered widget. */}
      <div
        ref={ref}
        className="relative isolate h-72 w-full overflow-hidden rounded-2xl sm:h-80 lg:h-[420px]"
        aria-label={
          data.nodes.length > 0
            ? `Interactive knowledge constellation with ${data.nodes.length} concept${data.nodes.length === 1 ? "" : "s"}. Every concept is also available, with the same name and mastery detail, in the list view.`
            : undefined
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 30% 20%, color-mix(in srgb, var(--accent-2) 24%, transparent), transparent 70%), radial-gradient(55% 55% at 80% 80%, color-mix(in srgb, #8b6bff 20%, transparent), transparent 70%)",
          }}
        />
        {data.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-muted">
            {emptyHint}
          </div>
        ) : showList ? (
          <ConstellationListView data={data} />
        ) : webglOk ? (
          inView && (
            <ConstellationScene
              data={data}
              paused={paused || reducedMotion}
              focusedId={focusedId}
              onFocusChange={setLocalFocusedId}
              onSelect={handleSelect}
            />
          )
        ) : (
          <ConstellationFallback data={data} onSelect={handleSelect} />
        )}
      </div>
    </div>
  );
}
