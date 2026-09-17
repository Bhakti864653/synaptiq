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

function Node({
  node,
  focused,
  onHover,
  onSelect,
}: {
  node: ConstellationNode;
  focused: boolean;
  onHover: (id: string | null) => void;
  onSelect: (node: ConstellationNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || focused;

  return (
    <group position={node.position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(node.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        scale={active ? 1.5 : 1}
      >
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={active ? 1.1 : 0.55}
          toneMapped={false}
        />
      </mesh>
      {active && (
        <Html distanceFactor={8} center style={{ pointerEvents: "none" }}>
          <div
            className="whitespace-nowrap rounded-[8px_3px_8px_3px] border border-line bg-surface px-2.5 py-1.5 text-xs text-ink shadow-lg"
            role="status"
          >
            <div className="font-medium">{node.label}</div>
            <div className="text-ink-muted">
              {node.mastery === null ? "Not yet attempted" : `${node.mastery}% mastery`}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function ConstellationScene({
  data,
  paused,
  focusedId,
  onSelect,
}: {
  data: ConstellationData;
  paused: boolean;
  focusedId: string | null;
  onSelect: (node: ConstellationNode) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const nodesById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const activeId = hoveredId ?? focusedId;

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
            focused={node.id === activeId}
            onHover={setHoveredId}
            onSelect={onSelect}
          />
        ))}
      </RotatingGroup>
    </Canvas>
  );
}
