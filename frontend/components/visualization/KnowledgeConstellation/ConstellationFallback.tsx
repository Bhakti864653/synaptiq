"use client";

import { useState } from "react";
import type { ConstellationData, ConstellationNode } from "@/lib/visualization/buildConstellationData";

// Static SVG rendering of the exact same data/positions the WebGL scene
// uses (x/y from the same 3D layout, z dropped) - used whenever WebGL is
// unavailable, so a user on a locked-down browser still sees a real,
// polished representation of their own concepts rather than an empty box.
export default function ConstellationFallback({
  data,
  onSelect,
}: {
  data: ConstellationData;
  onSelect: (node: ConstellationNode) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));

  // Project the 3D layout down to a 0-100 viewBox, ignoring z (a simple
  // orthographic projection - z only ever affected 3D depth, not which
  // cluster a node visually belongs to).
  const xs = data.nodes.map((n) => n.position[0]);
  const ys = data.nodes.map((n) => n.position[1]);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(0, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  function project(node: ConstellationNode): [number, number] {
    const x = 10 + ((node.position[0] - minX) / spanX) * 80;
    const y = 10 + ((node.position[1] - minY) / spanY) * 80;
    return [x, y];
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label="Static constellation of your concepts, grouped by material"
    >
      {data.edges.map((edge, i) => {
        const source = nodesById.get(edge.source);
        const target = nodesById.get(edge.target);
        if (!source || !target) return null;
        const [x1, y1] = project(source);
        const [x2, y2] = project(target);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--line)"
            strokeWidth="0.3"
          />
        );
      })}
      {data.nodes.map((node) => {
        const [x, y] = project(node);
        const active = node.id === activeId;
        return (
          <g
            key={node.id}
            tabIndex={0}
            role="button"
            aria-label={`${node.label}: ${node.mastery === null ? "not yet attempted" : `${node.mastery}% mastery`}`}
            onFocus={() => setActiveId(node.id)}
            onBlur={() => setActiveId((id) => (id === node.id ? null : id))}
            onMouseEnter={() => setActiveId(node.id)}
            onMouseLeave={() => setActiveId((id) => (id === node.id ? null : id))}
            onClick={() => onSelect(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(node);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <circle cx={x} cy={y} r={active ? 3.4 : 2.4} fill={node.color} />
            {active && (
              <text
                x={x}
                y={y - 4.5}
                textAnchor="middle"
                fontSize="3.2"
                fill="var(--ink)"
                style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 1.5 }}
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
