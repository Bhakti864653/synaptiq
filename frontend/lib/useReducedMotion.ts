"use client";

import { useSyncExternalStore } from "react";

// useSyncExternalStore (not an effect + setState) is the correct way to
// read a browser API's live value during render - matchMedia here is
// exactly the kind of external, subscribable source it exists for, and it
// avoids the extra render pass an effect-driven setState would cost.
// getServerSnapshot returns false since there is no user preference to
// read on the server - the 3D canvases this feeds are already lazy-mounted
// client components, so a brief false-negative before hydration settles is
// harmless.
function subscribe(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
