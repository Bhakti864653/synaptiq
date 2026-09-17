"use client";

import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";

const ChemistryMoleculeScene = dynamic(() => import("./ChemistryMoleculeScene"), { ssr: false });

export default function ChemistryMolecule({ conceptNames }: { conceptNames: string[] }) {
  const atomCount = Math.max(1, Math.min(conceptNames.length, 10));

  return (
    <VisualizationFrame
      title="Chemistry visualization"
      caption={`A schematic ball-and-stick arrangement (not a specific compound) - ${atomCount} atom${atomCount === 1 ? "" : "s"}, one per concept in this material.`}
      renderScene={({ paused }) => <ChemistryMoleculeScene atomCount={atomCount} paused={paused} />}
      renderFallback={() => (
        <ul className="flex h-full flex-col gap-1 overflow-y-auto p-4 text-sm text-ink">
          {conceptNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    />
  );
}
