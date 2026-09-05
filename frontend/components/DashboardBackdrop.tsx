// Same "Warm Margin" visual language as the landing page (one asymmetric
// glow blob + a faint synapse dot-network), but fixed and calibrated much
// lower-opacity: this sits behind dozens of information-dense study
// screens, not one sparse hero, so the atmosphere has to stay recognizable
// without fighting with the actual content people are trying to read.
const DOTS: [number, number][] = [
  [88, 6], [96, 16], [92, 28], [80, 10],
  [6, 84], [14, 94], [4, 70],
];

const LINES: [number, number][] = [
  [0, 1], [1, 2], [0, 3],
  [4, 5], [4, 6],
];

export default function DashboardBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="landing-glow-drift absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--accent-2) 0%, transparent 65%)",
        }}
      />
      <div
        className="landing-glow-drift absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--brand) 0%, transparent 65%)",
          animationDelay: "-7s",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
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
          <circle key={i} cx={x} cy={y} r="0.5" fill="var(--accent-2)" />
        ))}
      </svg>
    </div>
  );
}
