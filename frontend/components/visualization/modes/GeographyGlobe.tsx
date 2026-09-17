"use client";

import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";
import { markerFromLabel } from "./GeographyGlobeScene";

const GeographyGlobeScene = dynamic(() => import("./GeographyGlobeScene"), { ssr: false });

export default function GeographyGlobe({ conceptNames }: { conceptNames: string[] }) {
  const markers = conceptNames.map(markerFromLabel);

  return (
    <VisualizationFrame
      title="Geography visualization"
      caption="An interactive globe with a marker for each concept in this material."
      renderScene={({ paused }) => <GeographyGlobeScene markers={markers} paused={paused} />}
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
