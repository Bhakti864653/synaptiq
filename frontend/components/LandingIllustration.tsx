// Decorative background for the landing hero: soft drifting color blobs
// plus a faint constellation of connected dots - a quiet nod to "synapse"
// without being a literal circuit-board cliche. Purely decorative (aria-hidden),
// sits behind the hero content.
const DOTS: [number, number][] = [
  [8, 18], [16, 34], [6, 52], [22, 12], [30, 46],
  [88, 22], [94, 44], [80, 12], [92, 62], [76, 50],
  [14, 76], [86, 80], [50, 8], [46, 92],
];

const LINES: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [3, 4], [1, 4],
  [5, 6], [5, 7], [6, 8], [6, 9], [7, 5],
  [2, 10], [8, 11], [3, 12], [10, 13],
];

export default function LandingIllustration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="mascot-float absolute -left-24 top-10 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--brand)" }}
      />
      <div
        className="mascot-float-slow absolute -right-20 top-1/3 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent-2)" }}
      />
      <div
        className="mascot-float absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--series-3)", animationDelay: "-3s" }}
      />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18]"
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
            stroke="var(--brand)"
            strokeWidth="0.15"
          />
        ))}
        {DOTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.6" fill="var(--accent-2)" />
        ))}
      </svg>
    </div>
  );
}
