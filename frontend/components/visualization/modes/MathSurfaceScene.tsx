"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { evaluateSafeExpression, type ParsedEquation } from "@/lib/visualization/safeMathParser";

const RANGE = 5;

// Builds the REAL graph of the parsed equation - every vertex's height is
// the actual evaluated function, never a decorative substitute. Mastery
// is only ever allowed to affect `emphasis` (color/opacity), passed
// separately - it never reaches this geometry function.
function buildGraphGeometry(parsed: ParsedEquation): THREE.BufferGeometry {
  if (!parsed.usesY) {
    // A 2D curve y = f(x): drawn as a thin ribbon along x, height = f(x),
    // flat in z - a real graph, not a surface pretending to be one.
    const segments = 200;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const x = -RANGE + (2 * RANGE * i) / segments;
      const y = evaluateSafeExpression(parsed.node, x, 0);
      points.push(new THREE.Vector3(x, clampFinite(y), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  // z = f(x, y): a real wireframe surface.
  const segments = 48;
  const geometry = new THREE.PlaneGeometry(RANGE * 2, RANGE * 2, segments, segments);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = evaluateSafeExpression(parsed.node, x, y);
    position.setZ(i, clampFinite(z));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function clampFinite(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-RANGE, Math.min(RANGE, v));
}

function Graph({
  parsed,
  paused,
  emphasis,
}: {
  parsed: ParsedEquation;
  paused: boolean;
  emphasis: number; // 0-1, mastery-driven color/opacity emphasis only
}) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildGraphGeometry(parsed), [parsed]);
  const color = "#8b6bff";
  const opacity = 0.4 + emphasis * 0.4;

  useFrame((_, delta) => {
    if (paused || !group.current) return;
    group.current.rotation.z += delta * 0.05;
  });

  if (!parsed.usesY) {
    return (
      <group ref={group}>
        <line>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial color={color} transparent opacity={0.5 + emphasis * 0.5} />
        </line>
      </group>
    );
  }

  return (
    <group ref={group} rotation={[-0.6, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

export default function MathSurfaceScene({
  parsed,
  paused,
  emphasis,
}: {
  parsed: ParsedEquation;
  paused: boolean;
  emphasis: number;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 2, 9], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={35} color="#f6b552" />
      <pointLight position={[-5, -3, -5]} intensity={20} color="#ef6a4c" />
      <Graph parsed={parsed} paused={paused} emphasis={emphasis} />
    </Canvas>
  );
}
