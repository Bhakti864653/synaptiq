"use client";

import dynamic from "next/dynamic";
import VisualizationFrame from "../VisualizationFrame";
import AccessibleConceptList from "../AccessibleConceptList";
import { ELEMENT_COLORS, type CuratedMolecule } from "@/lib/visualization/curatedMolecules";

const ChemistryMoleculeScene = dynamic(() => import("./ChemistryMoleculeScene"), { ssr: false });

function elementCounts(molecule: CuratedMolecule): [string, number][] {
  const counts = new Map<string, number>();
  for (const atom of molecule.atoms) counts.set(atom.element, (counts.get(atom.element) ?? 0) + 1);
  return Array.from(counts.entries());
}

export default function ChemistryMolecule({ molecule }: { molecule: CuratedMolecule }) {
  const counts = elementCounts(molecule);

  return (
    <VisualizationFrame
      title="Chemistry visualization"
      caption={`${molecule.name} (${molecule.formula}) - ${molecule.geometryLabel}. This is a real, chemically accurate structure, not generated from this material's concept count.`}
      ariaLabel={`Ball-and-stick model of ${molecule.name}, formula ${molecule.formula}. Element legend and atom list are also available in the list view.`}
      renderScene={({ paused }) => <ChemistryMoleculeScene molecule={molecule} paused={paused} />}
      renderFallback={() => (
        <AccessibleConceptList
          emptyMessage=""
          items={molecule.atoms.map((atom, i) => ({
            key: String(i),
            label: `Atom ${i + 1}: ${atom.element}`,
          }))}
        />
      )}
      listView={
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Legend
            </h3>
            <ul className="flex flex-col gap-1">
              {counts.map(([element, count]) => (
                <li key={element} className="flex items-center gap-2 text-sm text-ink">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] }}
                  />
                  {element} {"×"} {count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Bonds
            </h3>
            <AccessibleConceptList
              emptyMessage="No bonds."
              items={molecule.bonds.map((bond, i) => ({
                key: String(i),
                label: `${molecule.atoms[bond.from].element}–${molecule.atoms[bond.to].element}`,
                detail: bond.order,
              }))}
            />
          </div>
        </div>
      }
    />
  );
}
