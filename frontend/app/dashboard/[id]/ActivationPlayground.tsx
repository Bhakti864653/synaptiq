"use client";

import { useRef, useState } from "react";

type Point = { x: number; y: number };

const WIDTH = 260;
const HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const FUNCTIONS: {
  key: string;
  name: string;
  colorVar: string;
  yDomain: [number, number];
  fn: (x: number) => number;
  formula: string;
}[] = [
  {
    key: "relu",
    name: "ReLU",
    colorVar: "var(--series-1)",
    yDomain: [-1, 5],
    fn: (x) => Math.max(0, x),
    formula: "max(0, x)",
  },
  {
    key: "sigmoid",
    name: "Sigmoid",
    colorVar: "var(--series-2)",
    yDomain: [-0.1, 1.1],
    fn: (x) => 1 / (1 + Math.exp(-x)),
    formula: "1 / (1 + e⁻ˣ)",
  },
  {
    key: "tanh",
    name: "Tanh",
    colorVar: "var(--series-3)",
    yDomain: [-1.2, 1.2],
    fn: (x) => Math.tanh(x),
    formula: "tanh(x)",
  },
];

const X_DOMAIN: [number, number] = [-5, 5];

function scaleX(x: number) {
  const [x0, x1] = X_DOMAIN;
  return PAD.left + ((x - x0) / (x1 - x0)) * (WIDTH - PAD.left - PAD.right);
}

function scaleY(y: number, yDomain: [number, number]) {
  const [y0, y1] = yDomain;
  return HEIGHT - PAD.bottom - ((y - y0) / (y1 - y0)) * (HEIGHT - PAD.top - PAD.bottom);
}

function buildPath(points: Point[], yDomain: [number, number]) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y, yDomain).toFixed(1)}`)
    .join(" ");
}

function Panel({ spec }: { spec: (typeof FUNCTIONS)[number] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Point | null>(null);

  const points: Point[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = X_DOMAIN[0] + (i / 100) * (X_DOMAIN[1] - X_DOMAIN[0]);
    points.push({ x, y: spec.fn(x) });
  }

  const zeroY = scaleY(0, spec.yDomain);
  const zeroX = scaleX(0);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const x = X_DOMAIN[0] + ((svgX - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (X_DOMAIN[1] - X_DOMAIN[0]);
    if (x < X_DOMAIN[0] || x > X_DOMAIN[1]) {
      setHover(null);
      return;
    }
    setHover({ x, y: spec.fn(x) });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: spec.colorVar }}
        />
        <span className="font-medium text-ink">{spec.name}</span>
        <span className="font-mono text-xs text-ink-muted">{spec.formula}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-lg border border-line bg-surface"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* axes */}
        <line x1={PAD.left} y1={zeroY} x2={WIDTH - PAD.right} y2={zeroY} stroke="var(--line)" strokeWidth={1} />
        <line x1={zeroX} y1={PAD.top} x2={zeroX} y2={HEIGHT - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
        <text x={WIDTH - PAD.right} y={zeroY - 4} textAnchor="end" fontSize={9} fill="var(--ink-muted)">
          x
        </text>

        <path d={buildPath(points, spec.yDomain)} fill="none" stroke={spec.colorVar} strokeWidth={2} />

        {hover && (
          <>
            <line
              x1={scaleX(hover.x)}
              y1={PAD.top}
              x2={scaleX(hover.x)}
              y2={HEIGHT - PAD.bottom}
              stroke="var(--ink-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={scaleX(hover.x)}
              cy={scaleY(hover.y, spec.yDomain)}
              r={4}
              fill={spec.colorVar}
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
      <p className="h-4 font-mono text-xs text-ink-muted">
        {hover ? `x=${hover.x.toFixed(2)}  ${spec.name.toLowerCase()}(x)=${hover.y.toFixed(3)}` : " "}
      </p>
    </div>
  );
}

export default function ActivationPlayground() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Activation-function playground</h2>
        <p className="text-sm text-ink-muted">
          The same input, x, run through three different activation functions. Hover any curve to
          read exact values. Notice ReLU is unbounded and linear past zero, while sigmoid and tanh
          squash everything into a fixed range — that difference is what makes each one suited to
          different layers of a network.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FUNCTIONS.map((spec) => (
          <Panel key={spec.key} spec={spec} />
        ))}
      </div>
    </div>
  );
}
