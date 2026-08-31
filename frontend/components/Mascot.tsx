export type MascotExpression = "idle" | "excited" | "celebrating" | "encouraging";

// Spark - a cute, minimal glowing-brain mascot. Deliberately its own warm
// palette (yellow-orange -> hot pink) rather than the app's indigo UI
// colors, so it pops as a character instead of blending into the chrome.
// Flat vector shapes + a soft ambient glow, no anatomical brain detail.
export default function Mascot({
  expression = "idle",
  size = 64,
  className = "",
}: {
  expression?: MascotExpression;
  size?: number;
  className?: string;
}) {
  const bodyGradient = "mascot-body-gradient";
  const glowFilter = "mascot-glow-filter";
  const sparkCount = expression === "celebrating" ? 4 : expression === "excited" ? 3 : 2;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${expressionClass(expression)} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={bodyGradient}
          gradientUnits="userSpaceOnUse"
          x1="18"
          y1="20"
          x2="98"
          y2="92"
        >
          <stop offset="0%" stopColor="#ffb020" />
          <stop offset="100%" stopColor="#ff2f8e" />
        </linearGradient>
        <filter id={glowFilter} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ambient glow behind the whole character */}
      <ellipse cx="60" cy="58" rx="40" ry="36" fill={`url(#${bodyGradient})`} opacity="0.35" filter={`url(#${glowFilter})`} />

      {/* sparks - floating around, not attached to the body */}
      {SPARK_POSITIONS.slice(0, sparkCount).map((pos, i) => (
        <Spark key={i} x={pos.x} y={pos.y} scale={pos.scale} delay={i * 0.25} />
      ))}

      {/* brain silhouette: two lobes + body, one continuous gradient */}
      <g>
        <circle cx="40" cy="38" r="21" fill={`url(#${bodyGradient})`} />
        <circle cx="80" cy="38" r="21" fill={`url(#${bodyGradient})`} />
        <ellipse cx="60" cy="66" rx="38" ry="32" fill={`url(#${bodyGradient})`} />
        {/* hemisphere seam + a few soft fold lines - just enough to read as
            a brain at a glance, not literal anatomy */}
        <path
          d="M 60 22 Q 56 42 60 66 Q 64 90 60 98"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 26 30 Q 36 24 44 30"
          stroke="#ffffff"
          strokeOpacity="0.3"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 76 30 Q 84 24 94 30"
          stroke="#ffffff"
          strokeOpacity="0.3"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 30 54 Q 40 50 46 56"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 74 56 Q 80 50 90 54"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <Face expression={expression} />
    </svg>
  );
}

const SPARK_POSITIONS = [
  { x: 14, y: 30, scale: 1 },
  { x: 106, y: 24, scale: 0.8 },
  { x: 108, y: 76, scale: 0.9 },
  { x: 10, y: 82, scale: 0.7 },
];

function Spark({ x, y, scale, delay }: { x: number; y: number; scale: number; delay: number }) {
  const r = 5 * scale;
  return (
    <path
      className="mascot-spark-twinkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M ${x} ${y - r} L ${x + r * 0.3} ${y - r * 0.3} L ${x + r} ${y} L ${x + r * 0.3} ${y + r * 0.3} L ${x} ${y + r} L ${x - r * 0.3} ${y + r * 0.3} L ${x - r} ${y} L ${x - r * 0.3} ${y - r * 0.3} Z`}
      fill="#fff6c8"
    />
  );
}

function Face({ expression }: { expression: MascotExpression }) {
  const eyeCy = 64;

  if (expression === "celebrating") {
    return (
      <g>
        <Eye cx={44} cy={eyeCy} happy />
        <Eye cx={76} cy={eyeCy} happy />
        <path d="M 42 82 Q 60 96 78 82" stroke="#2a1240" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="80" r="4" fill="#ff2f8e" opacity="0.5" />
        <circle cx="90" cy="80" r="4" fill="#ff2f8e" opacity="0.5" />
      </g>
    );
  }
  if (expression === "excited") {
    return (
      <g>
        <Eye cx={44} cy={eyeCy} big />
        <Eye cx={76} cy={eyeCy} big />
        <path d="M 44 82 Q 60 94 76 82" stroke="#2a1240" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (expression === "encouraging") {
    return (
      <g>
        <Eye cx={44} cy={eyeCy} />
        <Eye cx={76} cy={eyeCy} />
        <path d="M 46 84 Q 60 90 74 84" stroke="#2a1240" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  // idle
  return (
    <g>
      <Eye cx={44} cy={eyeCy} />
      <Eye cx={76} cy={eyeCy} />
      <path d="M 45 83 Q 60 92 75 83" stroke="#2a1240" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Eye({ cx, cy, big = false, happy = false }: { cx: number; cy: number; big?: boolean; happy?: boolean }) {
  if (happy) {
    // closed, joyful upward arc
    return (
      <path
        d={`M ${cx - 8} ${cy + 2} Q ${cx} ${cy - 10} ${cx + 8} ${cy + 2}`}
        stroke="#2a1240"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  const rx = big ? 11 : 9.5;
  const ry = big ? 13 : 11.5;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" />
      <circle cx={cx + 1.5} cy={cy + 2} r={rx * 0.55} fill="#2a1240" />
      <circle cx={cx + 4} cy={cy - 3} r={rx * 0.18} fill="#ffffff" />
    </g>
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
