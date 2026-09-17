import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same two-node-plus-spark mark as icon.tsx, at home-screen-icon scale -
// enough room here to add the connecting arms and a soft paper backdrop
// (App icons render on their own square, unlike a favicon that sits on a
// browser chrome background) so it reads as a complete mark, not just a
// favicon blown up.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          background: "#f6efdd",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 42,
            top: 46,
            width: 30,
            height: 8,
            borderRadius: 999,
            background: "linear-gradient(135deg, #f6b552, #f2914a)",
            transform: "rotate(38deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 42,
            bottom: 46,
            width: 30,
            height: 8,
            borderRadius: 999,
            background: "#ef6a4c",
            transform: "rotate(38deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 30,
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "linear-gradient(135deg, #f6b552, #f2914a)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 30,
            bottom: 30,
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "#ef6a4c",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 78,
            top: 78,
            width: 24,
            height: 24,
            borderRadius: 999,
            background: "#8b5cf6",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
