// Compact echo of the landing page's synapse dot-network, sized for a wide
// short banner rather than a full hero section - gives page-header banners
// (gradient-hero) some of the same "designed" texture instead of a flat
// gradient rectangle. Purely decorative.
const DOTS: [number, number][] = [
  [4, 20], [10, 60], [3, 85], [18, 8],
  [92, 15], [97, 55], [88, 88], [96, 78],
];

const LINES: [number, number][] = [
  [0, 1], [1, 2], [0, 3],
  [4, 5], [5, 7], [6, 7],
];

export default function HeroDots() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {LINES.map(([a, b], i) => (
        <line
          key={i}
          x1={DOTS[a][0]}
          y1={DOTS[a][1]}
          x2={DOTS[b][0]}
          y2={DOTS[b][1]}
          stroke="var(--ink)"
          strokeWidth="0.2"
        />
      ))}
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="var(--ink)" />
      ))}
    </svg>
  );
}
