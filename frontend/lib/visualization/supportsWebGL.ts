// A cheap, throwaway-canvas WebGL capability check - used to decide
// between mounting the real three.js scene and the CSS/SVG fallback.
// Never throws: some browsers (locked-down corporate images, certain
// headless/automation contexts) throw synchronously from getContext
// itself rather than returning null.
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}
