"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { ELEMENT_COLORS, type CuratedMolecule } from "@/lib/visualization/curatedMolecules";

// Bond order is shown structurally (how many parallel strokes, or a
// dashed ionic stroke), not invented - every molecule here comes from the
// curated, chemically-accurate list, never generated from a concept count.
function Bond({ molecule, from, to, order }: { molecule: CuratedMolecule; from: number; to: number; order: string }) {
  const a = new THREE.Vector3(...molecule.atoms[from].position);
  const b = new THREE.Vector3(...molecule.atoms[to].position);
  const dir = b.clone().sub(a).normalize();
  const perp = new THREE.Vector3(0, 1, 0).cross(dir);
  if (perp.lengthSq() < 0.001) perp.set(1, 0, 0).cross(dir);
  perp.normalize().multiplyScalar(0.06);

  if (order === "ionic") {
    // A visually distinct dashed-feeling stroke (short dashes) instead of
    // a solid line, so an ionic pair never reads as a shared covalent bond.
    const segments = 8;
    const points: [number, number, number][] = [];
    for (let i = 0; i < segments; i += 2) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      points.push(a.clone().lerp(b, t0).toArray() as [number, number, number]);
      points.push(a.clone().lerp(b, t1).toArray() as [number, number, number]);
    }
    return (
      <>
        {Array.from({ length: segments / 2 }).map((_, i) => (
          <Line
            key={i}
            points={[points[i * 2], points[i * 2 + 1]]}
            color="#c9b892"
            lineWidth={2}
            transparent
            opacity={0.7}
          />
        ))}
      </>
    );
  }

  const strokeCount = order === "triple" ? 3 : order === "double" ? 2 : 1;
  const offsets = strokeCount === 1 ? [0] : strokeCount === 2 ? [-1, 1] : [-1, 0, 1];

  return (
    <>
      {offsets.map((o, i) => {
        const offset = perp.clone().multiplyScalar(o * 0.7);
        return (
          <Line
            key={i}
            points={[a.clone().add(offset).toArray() as [number, number, number], b.clone().add(offset).toArray() as [number, number, number]]}
            color="#c9b892"
            lineWidth={2}
            transparent
            opacity={0.6}
          />
        );
      })}
    </>
  );
}

function Molecule({ molecule, paused }: { molecule: CuratedMolecule; paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (paused || !group.current) return;
    group.current.rotation.y += delta * 0.18;
    group.current.rotation.x += delta * 0.05;
  });

  return (
    <group ref={group}>
      {molecule.bonds.map((bond, i) => (
        <Bond key={i} molecule={molecule} from={bond.from} to={bond.to} order={bond.order} />
      ))}
      {molecule.atoms.map((atom, i) => {
        const color = ELEMENT_COLORS[atom.element];
        // Real (relative) atomic radii, not uniform balls - hydrogen
        // reads visibly smaller than carbon/oxygen/etc, matching how
        // ball-and-stick models are conventionally drawn.
        const radius = atom.element === "H" ? 0.16 : 0.3;
        return (
          <mesh key={i} position={atom.position}>
            <sphereGeometry args={[radius, 20, 20]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ChemistryMoleculeScene({
  molecule,
  paused,
}: {
  molecule: CuratedMolecule;
  paused: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={35} color="#f6b552" />
      <pointLight position={[-4, -3, -4]} intensity={20} color="#8b6bff" />
      <Molecule molecule={molecule} paused={paused} />
    </Canvas>
  );
}
