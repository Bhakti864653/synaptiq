"use client";

import { useSyncExternalStore } from "react";
import { supportsWebGL } from "./supportsWebGL";

// WebGL support never changes mid-session, so there's nothing to actually
// subscribe to - but useSyncExternalStore (rather than an effect+setState)
// is still the right tool: getServerSnapshot returns false to match SSR
// (no `window` to test), and getSnapshot reads the real client-only value
// on the client's first render, without ever disagreeing with the
// server-rendered HTML the way computing this synchronously during render
// would (that mismatch is exactly what caused a real hydration bug here
// before this fix).
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return supportsWebGL();
}

function getServerSnapshot() {
  return false;
}

export function useWebGLSupport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
