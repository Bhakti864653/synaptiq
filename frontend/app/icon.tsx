import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon-scale simplification of the Synaptiq mark: at 32px there is no
// room for the full curved "S" and stay legible, so this keeps only what
// has to survive the down-scale - the two synaptic nodes on a diagonal,
// bridged by one small violet spark in the gap between them. Built from
// plain divs (not the SVG mark component) since ImageResponse renders via
// satori, which supports HTML-like primitives far more reliably than
// arbitrary nested <svg> path data.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: 15,
            height: 15,
            borderRadius: 999,
            background: "linear-gradient(135deg, #f6b552, #f2914a)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 3,
            bottom: 3,
            width: 15,
            height: 15,
            borderRadius: 999,
            background: "#ef6a4c",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            width: 4,
            height: 4,
            borderRadius: 999,
            background: "#8b5cf6",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
