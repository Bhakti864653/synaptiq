// A small, hand-curated set of real molecules with chemically accurate
// connectivity and (approximate, visually-scaled) geometry - not
// generated from atom/concept counts. Bond angles for water and methane
// are the real textbook values; bond order (single/double/triple/ionic)
// is shown via the bond's own visual style, never invented.
export type Element = "H" | "O" | "C" | "N" | "Na" | "Cl";

export const ELEMENT_COLORS: Record<Element, string> = {
  H: "#f3ead9",
  O: "#ef6a4c",
  C: "#4a3f30",
  N: "#8b6bff",
  Na: "#f2a63f",
  Cl: "#5fb88f",
};

export type MoleculeAtom = { element: Element; position: [number, number, number] };
export type BondOrder = "single" | "double" | "triple" | "ionic";
export type MoleculeBond = { from: number; to: number; order: BondOrder };

export type CuratedMolecule = {
  name: string;
  formula: string;
  aliases: string[];
  geometryLabel: string;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
};

const deg = (d: number) => (d * Math.PI) / 180;

// O-H-O angle ~104.5 degrees, the real (textbook) bent geometry of water.
const waterHalfAngle = deg(104.5) / 2;

const tetra = 1 / Math.sqrt(3);

export const CURATED_MOLECULES: CuratedMolecule[] = [
  {
    name: "Water",
    formula: "H₂O",
    aliases: ["water", "h2o", "h₂o"],
    geometryLabel: "Bent (104.5° bond angle)",
    atoms: [
      { element: "O", position: [0, 0, 0] },
      { element: "H", position: [Math.sin(waterHalfAngle), -Math.cos(waterHalfAngle), 0] },
      { element: "H", position: [-Math.sin(waterHalfAngle), -Math.cos(waterHalfAngle), 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: "single" },
      { from: 0, to: 2, order: "single" },
    ],
  },
  {
    name: "Carbon dioxide",
    formula: "CO₂",
    aliases: ["carbon dioxide", "co2", "co₂"],
    geometryLabel: "Linear (180°)",
    atoms: [
      { element: "C", position: [0, 0, 0] },
      { element: "O", position: [1.16, 0, 0] },
      { element: "O", position: [-1.16, 0, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: "double" },
      { from: 0, to: 2, order: "double" },
    ],
  },
  {
    name: "Methane",
    formula: "CH₄",
    aliases: ["methane", "ch4", "ch₄"],
    geometryLabel: "Tetrahedral (109.5°)",
    atoms: [
      { element: "C", position: [0, 0, 0] },
      { element: "H", position: [tetra, tetra, tetra] },
      { element: "H", position: [tetra, -tetra, -tetra] },
      { element: "H", position: [-tetra, tetra, -tetra] },
      { element: "H", position: [-tetra, -tetra, tetra] },
    ],
    bonds: [
      { from: 0, to: 1, order: "single" },
      { from: 0, to: 2, order: "single" },
      { from: 0, to: 3, order: "single" },
      { from: 0, to: 4, order: "single" },
    ],
  },
  {
    name: "Oxygen",
    formula: "O₂",
    aliases: ["oxygen", "o2", "o₂", "diatomic oxygen", "dioxygen"],
    geometryLabel: "Diatomic",
    atoms: [
      { element: "O", position: [0.6, 0, 0] },
      { element: "O", position: [-0.6, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: "double" }],
  },
  {
    name: "Nitrogen",
    formula: "N₂",
    aliases: ["nitrogen", "n2", "n₂", "diatomic nitrogen", "dinitrogen"],
    geometryLabel: "Diatomic",
    atoms: [
      { element: "N", position: [0.55, 0, 0] },
      { element: "N", position: [-0.55, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: "triple" }],
  },
  {
    name: "Sodium chloride",
    formula: "NaCl",
    aliases: ["sodium chloride", "nacl", "table salt"],
    geometryLabel: "Ionic pair (electron transfer, not a shared covalent bond)",
    atoms: [
      { element: "Na", position: [0.7, 0, 0] },
      { element: "Cl", position: [-0.7, 0, 0] },
    ],
    bonds: [{ from: 0, to: 1, order: "ionic" }],
  },
];

export function matchCuratedMolecule(text: string): CuratedMolecule | null {
  const normalized = text.toLowerCase().trim();
  for (const molecule of CURATED_MOLECULES) {
    if (molecule.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return molecule;
    }
  }
  return null;
}
