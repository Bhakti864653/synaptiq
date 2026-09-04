"use client";

import { useState } from "react";

type Point = { date: string; value: number };

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Parses "YYYY-MM-DD" by hand instead of `new Date(iso)`, which treats a
// date-only string as UTC midnight and can render as the previous day in
// timezones behind UTC.
function formatDate(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export default function TrendChart({
  points,
  formatValue = (v) => `${v}%`,
}: {
  points: Point[];
  formatValue?: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    points.length > 1
      ? PAD_LEFT + (i / (points.length - 1)) * plotWidth
      : PAD_LEFT + plotWidth / 2;
  const yFor = (value: number) => PAD_TOP + (1 - value / 100) * plotHeight;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`)
    .join(" ");

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-muted text-[10px]"
            >
              {tick}%
            </text>
          </g>
        ))}

        <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth={2} />

        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={xFor(i)}
            cy={yFor(p.value)}
            r={hoverIndex === i ? 5 : 4}
            fill="var(--brand)"
          />
        ))}

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--line)"
            strokeWidth={1}
          />
        )}

        {points.map((p, i) =>
          i === 0 || i === points.length - 1 ? (
            <text
              key={`label-${p.date}`}
              x={xFor(i)}
              y={HEIGHT - PAD_BOTTOM + 16}
              textAnchor={i === 0 ? "start" : "end"}
              className="fill-ink-muted text-[10px]"
            >
              {formatDate(p.date)}
            </text>
          ) : null,
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
          style={{
            left: `${(xFor(hoverIndex!) / WIDTH) * 100}%`,
            top: `${(yFor(hovered.value) / HEIGHT) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          {formatDate(hovered.date)} · {formatValue(hovered.value)}
        </div>
      )}
    </div>
  );
}
