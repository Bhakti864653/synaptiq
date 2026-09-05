"use client";

import { useEffect, useRef } from "react";

// Mutates the overlay's own CSS variables directly via a ref instead of
// React state, so the mouse-following glow doesn't trigger a re-render
// on every mousemove event.
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handleMove(e: MouseEvent) {
      el!.style.setProperty("--mx", `${e.clientX}px`);
      el!.style.setProperty("--my", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(500px circle at var(--mx, 50%) var(--my, 25%), color-mix(in srgb, var(--landing-glow-violet) 25%, transparent), transparent 65%)",
      }}
    />
  );
}
