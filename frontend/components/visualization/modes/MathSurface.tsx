"use client";

import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";

const MathSurfaceScene = dynamic(() => import("./MathSurfaceScene"), { ssr: false });

export default function MathSurface({ overallMastery }: { overallMastery: number | null }) {
  const roughness = overallMastery === null ? 0.6 : 1 - overallMastery / 100;

  return (
    <VisualizationFrame
      title="Mathematics visualization"
      caption="A schematic surface, not a graph of a specific equation from this material - it settles as your mastery here grows."
      renderScene={({ paused }) => <MathSurfaceScene roughness={roughness} paused={paused} />}
      renderFallback={() => (
        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-muted">
          {overallMastery === null
            ? "Start practicing to see this settle into a calmer shape."
            : `${overallMastery}% mastery on this material.`}
        </div>
      )}
    />
  );
}
