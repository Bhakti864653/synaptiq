"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";
import AccessibleConceptList from "../AccessibleConceptList";
import type { GeographyConceptMatch } from "@/lib/visualization/extractGeographyFeatures";

const GeographyGlobeScene = dynamic(() => import("./GeographyGlobeScene"), { ssr: false });

export default function GeographyGlobe({ matches }: { matches: GeographyConceptMatch[] }) {
  const [resetToken, setResetToken] = useState(0);
  const recognized = matches.filter((m) => m.feature !== null);
  const unrecognized = matches.filter((m) => m.feature === null);

  const caption =
    recognized.length > 0
      ? `A conceptual, stylized globe - terrain and ocean depth shown here are illustrative, not real elevation data. ${recognized.length} concept${recognized.length === 1 ? "" : "s"} matched a verified location and ${recognized.length === 1 ? "is" : "are"} marked below; the rest of this material's concepts aren't tied to a specific place, so they're listed but not placed on the globe.`
      : "A conceptual, stylized globe - terrain and ocean depth shown here are illustrative, not real elevation data. None of this material's concepts matched a verified location, so no markers are shown.";

  return (
    <VisualizationFrame
      title="Geography visualization"
      caption={caption}
      ariaLabel="Interactive conceptual globe. Drag to rotate, scroll to zoom. Verified locations are also listed in the list view."
      extraControls={() => (
        <button
          type="button"
          onClick={() => setResetToken((t) => t + 1)}
          className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Reset view
        </button>
      )}
      renderScene={({ paused }) => (
        <GeographyGlobeScene
          markers={recognized.map((m) => ({ label: m.label, feature: m.feature! }))}
          paused={paused}
          resetToken={resetToken}
        />
      )}
      renderFallback={() => (
        <AccessibleConceptList
          emptyMessage="No concepts yet."
          items={matches.map((m) => ({
            key: String(m.conceptIndex),
            label: m.label,
            detail: m.feature ? m.feature.name : undefined,
          }))}
        />
      )}
      listView={
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
          {recognized.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Verified locations
              </h3>
              <AccessibleConceptList
                emptyMessage=""
                items={recognized.map((m) => ({
                  key: String(m.conceptIndex),
                  label: m.label,
                  detail: m.feature!.name,
                }))}
              />
            </div>
          )}
          {unrecognized.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Other concepts in this material
              </h3>
              <AccessibleConceptList
                emptyMessage=""
                items={unrecognized.map((m) => ({ key: String(m.conceptIndex), label: m.label }))}
              />
            </div>
          )}
        </div>
      }
    />
  );
}
