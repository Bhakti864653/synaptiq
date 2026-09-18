"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ConstellationData, ConstellationNode } from "@/lib/visualization/buildConstellationData";

const MAX_DPR = 1.75;

function RotatingGroup({
  paused,
  children,
}: {
  paused: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (paused || !group.current) return;
    // Slow and restrained on purpose - this is ambient atmosphere, not a
    // thing the eye should be drawn to chase.
    group.current.rotation.y += delta * 0.06;
  });
  return <group ref={group}>{children}</group>;
}

// The glowing sphere mesh is purely decorative - all real interaction
// (hover, keyboard focus, click, Enter/Space activation) happens on the
// real HTML <button> rendered via drei's <Html>, which drei keeps
// projected onto this node's true screen position every frame. This is
// what makes the node genuinely keyboard-reachable: a raw three.js mesh
// can never receive DOM focus on its own, no matter what pointer handlers
// it has.
function Node({
  node,
  focused,
  onFocusChange,
  onSelect,
}: {
  node: ConstellationNode;
  focused: boolean;
  onFocusChange: (id: string | null) => void;
  onSelect: (node: ConstellationNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || focused;
  const masteryText = node.mastery === null ? "not yet attempted" : `${node.mastery}% mastery`;

  return (
    <group position={node.position}>
      <mesh scale={active ? 1.5 : 1}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={active ? 1.1 : 0.55}
          toneMapped={false}
        />
      </mesh>
      <Html center distanceFactor={8} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          aria-label={`${node.label}, ${masteryText}. Activate to open its material.`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => onFocusChange(node.id)}
          onBlur={() => onFocusChange(null)}
          onClick={() => onSelect(node)}
          style={{
            position: "relative",
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {active && (
            <span
              className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-[8px_3px_8px_3px] border border-line bg-surface px-2.5 py-1.5 text-xs text-ink shadow-lg"
              role="status"
            >
              <span className="block font-medium">{node.label}</span>
              <span className="block text-ink-muted">{masteryText}</span>
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

export default function ConstellationScene({
  data,
  paused,
  focusedId,
  onFocusChange,
  onSelect,
}: {
  data: ConstellationData;
  paused: boolean;
  focusedId: string | null;
  onFocusChange: (id: string | null) => void;
  onSelect: (node: ConstellationNode) => void;
}) {
  const nodesById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  return (
    <Canvas
      dpr={[1, MAX_DPR]}
      camera={{ position: [0, 0, 11], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <pointLight position={[6, 6, 6]} intensity={40} color="#f6b552" />
      <pointLight position={[-6, -4, -6]} intensity={25} color="#8b6bff" />

      <RotatingGroup paused={paused}>
        {data.edges.map((edge, i) => {
          const source = nodesById.get(edge.source);
          const target = nodesById.get(edge.target);
          if (!source || !target) return null;
          return (
            <Line
              key={i}
              points={[source.position, target.position]}
              color="#c9b892"
              transparent
              opacity={0.35}
              lineWidth={1}
            />
          );
        })}
        {data.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            focused={node.id === focusedId}
            onFocusChange={onFocusChange}
            onSelect={onSelect}
          />
        ))}
      </RotatingGroup>
    </Canvas>
  );
}
