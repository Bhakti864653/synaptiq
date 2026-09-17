"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

// A schematic ball-and-stick arrangement, not a real compound's actual
// structure - atom count only reflects how many real concepts exist in
// this material, arranged evenly around a central atom. Deliberately does
// not claim to depict any specific molecule.
function peripheralPositions(count: number, radius: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    positions.push([
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    ]);
  }
  return positions;
}

function Molecule({ atomCount, paused }: { atomCount: number; paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => peripheralPositions(atomCount, 1.7), [atomCount]);

  useFrame((_, delta) => {
    if (paused || !group.current) return;
    group.current.rotation.y += delta * 0.15;
    group.current.rotation.x += delta * 0.04;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#f2a63f" emissive="#f2a63f" emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      {positions.map((position, i) => (
        <group key={i}>
          <Line points={[[0, 0, 0], position]} color="#c9b892" transparent opacity={0.5} lineWidth={2} />
          <mesh position={position}>
            <sphereGeometry args={[0.24, 16, 16]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#ef6a4c" : "#8b6bff"}
              emissive={i % 2 === 0 ? "#ef6a4c" : "#8b6bff"}
              emissiveIntensity={0.35}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function ChemistryMoleculeScene({
  atomCount,
  paused,
}: {
  atomCount: number;
  paused: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={35} color="#f6b552" />
      <pointLight position={[-4, -3, -4]} intensity={20} color="#8b6bff" />
      <Molecule atomCount={Math.max(1, Math.min(atomCount, 10))} paused={paused} />
    </Canvas>
  );
}
