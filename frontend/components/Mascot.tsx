export type MascotExpression = "idle" | "excited" | "celebrating" | "encouraging";

// Spark - a small neuron character built to embody the brand literally
// rather than an arbitrary cute-blob mascot: a soma (body), three dendrite
// nubs, and one longer axon tail ending in a glowing synapse node. Body
// fill reuses the exact brand->accent-2 gradient already on the wordmark,
// so it reads as part of the identity rather than a bolted-on cartoon.
export default function Mascot({
  expression = "idle",
  size = 64,
  className = "",
}: {
  expression?: MascotExpression;
  size?: number;
  className?: string;
}) {
  const gradientId = "mascot-body-gradient";
  const glowId = "mascot-glow";

  return (
    <svg
      viewBox="0 0 100 108"
      width={size}
      height={(size * 108) / 100}
      className={`${expressionClass(expression)} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* axon tail + synapse node */}
      <path
        d="M 58 78 Q 82 82 80 100"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle
        cx="80"
        cy="101"
        r="6"
        fill="var(--accent-2)"
        filter={`url(#${glowId})`}
        className="mascot-spark"
      />

      {/* dendrite nubs */}
      <circle cx="24" cy="30" r="9" fill={`url(#${gradientId})`} />
      <circle cx="20" cy="55" r="8" fill={`url(#${gradientId})`} />
      <circle cx="35" cy="17" r="8" fill={`url(#${gradientId})`} />

      {/* soma (body) */}
      <ellipse cx="48" cy="52" rx="34" ry="32" fill={`url(#${gradientId})`} />

      {/* face */}
      <Face expression={expression} />
    </svg>
  );
}

function Face({ expression }: { expression: MascotExpression }) {
  if (expression === "celebrating") {
    return (
      <g>
        <path d="M 33 44 Q 37 38 41 44" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 55 44 Q 59 38 63 44" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 36 58 Q 48 70 60 58" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
        <Sparkle x={16} y={70} />
        <Sparkle x={78} y={40} />
      </g>
    );
  }
  if (expression === "excited") {
    return (
      <g>
        <circle cx="37" cy="48" r="4" fill="#ffffff" />
        <circle cx="59" cy="48" r="4" fill="#ffffff" />
        <path d="M 36 60 Q 48 68 60 60" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (expression === "encouraging") {
    return (
      <g>
        <circle cx="37" cy="49" r="3.5" fill="#ffffff" />
        <circle cx="59" cy="49" r="3.5" fill="#ffffff" />
        <path d="M 38 61 Q 48 65 58 61" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  // idle
  return (
    <g>
      <circle cx="37" cy="49" r="3.5" fill="#ffffff" />
      <circle cx="59" cy="49" r="3.5" fill="#ffffff" />
      <path d="M 39 60 Q 48 65 57 60" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M ${x} ${y - 6} L ${x + 1.5} ${y - 1.5} L ${x + 6} ${y} L ${x + 1.5} ${y + 1.5} L ${x} ${y + 6} L ${x - 1.5} ${y + 1.5} L ${x - 6} ${y} L ${x - 1.5} ${y - 1.5} Z`}
      fill="var(--accent-2)"
    />
  );
}

function expressionClass(expression: MascotExpression) {
  switch (expression) {
    case "celebrating":
      return "mascot-celebrating";
    case "excited":
      return "mascot-excited";
    default:
      return "mascot-idle";
  }
}
