// Decorative background for the "Warm Margin" landing redesign: one large
// glow blob placed asymmetrically (not centered), plus a faint synapse
// dot-network - a quieter, static echo of the "neural network" design
// direction that lost out to Warm Margin, kept as a subtle texture instead
// of a dominant animated one. Purely decorative (aria-hidden).
const DOTS: [number, number][] = [
  [70, 10], [82, 22], [92, 14], [88, 34], [76, 30],
  [8, 70], [18, 82], [6, 88], [26, 92], [14, 60],
  [50, 6], [94, 60], [4, 30],
];

const LINES: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [3, 4], [0, 4],
  [5, 6], [5, 7], [6, 8], [5, 9],
  [2, 11], [10, 0], [12, 5],
];

export default function LandingIllustration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="landing-glow-drift absolute -right-32 -top-40 h-[560px] w-[560px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--landing-glow-amber) 0%, transparent 65%)",
        }}
      />
      <div
        className="landing-glow-drift absolute -right-10 top-10 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--landing-glow-violet) 0%, transparent 65%)",
          animationDelay: "-6s",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
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
            stroke="var(--landing-glow-violet)"
            strokeWidth="0.15"
          />
        ))}
        {DOTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.55" fill="var(--landing-glow-amber)" />
        ))}
      </svg>
    </div>
  );
}
