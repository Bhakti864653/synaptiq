"use client";

import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";
import type { ExtractedEquation } from "@/lib/visualization/extractEquation";

const MathSurfaceScene = dynamic(() => import("./MathSurfaceScene"), { ssr: false });

export default function MathSurface({
  equation,
  overallMastery,
}: {
  equation: ExtractedEquation;
  overallMastery: number | null;
}) {
  const emphasis = overallMastery === null ? 0.3 : overallMastery / 100;

  return (
    <div className="flex flex-col gap-2">
      {/* The exact equation, visible beside the graph at all times -
          never just implied by the shape, and never altered by mastery. */}
      <p className="font-mono text-base text-ink">{equation.displayText}</p>
      <VisualizationFrame
        title="Mathematics visualization"
        caption="A real graph of this exact equation - mastery only changes its color emphasis, never the shape or values."
        ariaLabel={`Graph of the equation ${equation.displayText}, extracted from this material's own text.`}
        renderScene={({ paused }) => (
          <MathSurfaceScene parsed={equation.parsed} paused={paused} emphasis={emphasis} />
        )}
        renderFallback={() => (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="font-mono text-lg text-ink">{equation.displayText}</p>
            <p className="text-sm text-ink-muted">
              {overallMastery === null ? "Not yet practiced" : `${overallMastery}% mastery`}
            </p>
          </div>
        )}
      />
    </div>
  );
}
