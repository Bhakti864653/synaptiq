"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
}: {
  data: ConstellationData;
  title?: string;
  emptyHint?: string;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(reducedMotion);
  const [showList, setShowList] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const webglOk = useWebGLSupport();

  function handleSelect(node: ConstellationNode) {
    setFocusedId(node.id);
    router.push(`/dashboard/${node.documentId}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {title}
        </h2>
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

      {/* No hard rectangular border - a soft atmospheric glow instead, so
          the scene reads as part of the paper surface rather than another
          bordered widget stacked on the page. */}
      <div
        ref={ref}
        className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-80"
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
              "radial-gradient(60% 60% at 30% 20%, color-mix(in srgb, var(--accent-2) 20%, transparent), transparent 70%), radial-gradient(50% 50% at 80% 80%, color-mix(in srgb, #8b6bff 16%, transparent), transparent 70%)",
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
              onFocusChange={setFocusedId}
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
