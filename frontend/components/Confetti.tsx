"use client";

import { useEffect, useState } from "react";

const COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--accent-2)",
  "var(--mastered)",
];
const PIECE_COUNT = 24;
const LIFETIME_MS = 1600;

type Piece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
};

function generatePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.1 + Math.random() * 0.5,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
  }));
}

// Pure CSS confetti burst for a perfect quiz score - no library. Renders
// nothing until an effect runs after mount, so the randomized burst only
// ever exists client-side (no SSR/hydration mismatch) and never delays the
// actual score/results, which are already on screen underneath it.
export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    setPieces(generatePieces());
    const timer = setTimeout(() => setPieces(null), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!pieces) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
