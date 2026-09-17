"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A wireframe parametric surface, not a graph of any real equation from
// the material - roughness (0-1) is the one real signal it reflects:
// lower mastery renders a rougher, more turbulent surface; higher mastery
// settles into a calmer, smoother one. Purely atmospheric, captioned as
// such by the caller.
function buildSurfaceGeometry(roughness: number): THREE.BufferGeometry {
  const size = 5;
  const segments = 48;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const position = geometry.attributes.position;
  const amplitude = 0.25 + roughness * 0.65;
  const frequency = 0.9 + roughness * 1.1;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z =
      Math.sin(x * frequency) * Math.cos(y * frequency) * amplitude;
    position.setZ(i, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function Surface({ roughness, paused }: { roughness: number; paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildSurfaceGeometry(roughness), [roughness]);

  useFrame((_, delta) => {
    if (paused || !group.current) return;
    group.current.rotation.z += delta * 0.05;
  });

  return (
    <group ref={group} rotation={[-0.6, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#8b6bff"
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

export default function MathSurfaceScene({
  roughness,
  paused,
}: {
  roughness: number;
  paused: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 2, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={35} color="#f6b552" />
      <pointLight position={[-5, -3, -5]} intensity={20} color="#ef6a4c" />
      <Surface roughness={Math.max(0, Math.min(roughness, 1))} paused={paused} />
    </Canvas>
  );
}
