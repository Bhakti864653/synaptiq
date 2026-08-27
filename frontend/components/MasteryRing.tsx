import { masteryColorVar } from "@/lib/mastery";

export default function MasteryRing({
  score,
  size = 56,
}: {
  score: number | null;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = score === null ? circumference : circumference * (1 - score / 100);
  const color = score === null ? "var(--line)" : masteryColorVar(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </g>
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono font-semibold"
        style={{ fontSize: size / 4 }}
      >
        {score === null ? "–" : `${score}%`}
      </text>
    </svg>
  );
}
