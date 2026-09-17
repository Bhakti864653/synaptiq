"use client";

import { useId } from "react";

export type LogoVariant = "gradient" | "mono";

// The Synaptiq mark: a subtle letter "S" built from two neural terminals
// (the amber and coral nodes) whose connecting paths stop just short of
// each other - the gap is the synapse itself, bridged by one small violet
// spark. A faint open-page arc sits underneath as the "study" grounding
// note, deliberately quiet enough never to compete with the synapse shape.
//
// Geometry is simple on purpose (two node circles, two short bezier
// strokes, one dot, one thin base arc) so it still reads correctly at
// favicon size - nothing here depends on fine detail surviving a
// down-scale to 16px.
export default function SynaptiqMark({
  size = 32,
  variant = "gradient",
  className = "",
  title,
}: {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  title?: string;
}) {
  const gradientId = useId();
  const isMono = variant === "mono";

  const nodeTopFill = isMono ? "currentColor" : `url(#${gradientId})`;
  const nodeBottomFill = isMono ? "currentColor" : "#ef6a4c";
  const synapseFill = isMono ? "currentColor" : "#8b5cf6";

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {!isMono && (
        <defs>
          <linearGradient id={gradientId} x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f6b552" />
            <stop offset="100%" stopColor="#f2914a" />
          </linearGradient>
        </defs>
      )}

      {/* subtle open-page base - two shallow arcs, always faint */}
      <path
        d="M 9 39.5 Q 24 35.5 39 39.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.22"
      />
      <path
        d="M 10.5 42 Q 24 38.5 37.5 42"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.16"
      />

      {/* upper synaptic arm - reads as the top of the "S" */}
      <path
        d="M 16 14 C 27.5 14 29.5 20.5 23.2 22.7"
        stroke={nodeTopFill}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* lower synaptic arm - reads as the bottom of the "S" */}
      <path
        d="M 24.8 25.3 C 18.5 27.5 20.5 34 32 34"
        stroke={nodeBottomFill}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* the synapse: the intentional gap between the two arms, bridged by
          one small violet spark rather than a closed connection */}
      <circle cx="24" cy="24" r="2.1" fill={synapseFill} />

      {/* the two neural terminals */}
      <circle cx="16" cy="14" r="6" fill={nodeTopFill} />
      <circle cx="32" cy="34" r="6" fill={nodeBottomFill} />
    </svg>
  );
}
