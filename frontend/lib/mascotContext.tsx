"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { MascotExpression } from "@/components/Mascot";

type MascotState = { expression: MascotExpression; message: string | null };

type MascotContextValue = {
  state: MascotState;
  celebrate: (expression: MascotExpression, message: string) => void;
};

const MascotContext = createContext<MascotContextValue | null>(null);

const DISPLAY_MS = 4200;

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MascotState>({ expression: "idle", message: null });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback((expression: MascotExpression, message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState({ expression, message });
    timeoutRef.current = setTimeout(() => {
      setState({ expression: "idle", message: null });
    }, DISPLAY_MS);
  }, []);

  return (
    <MascotContext.Provider value={{ state, celebrate }}>
      {children}
    </MascotContext.Provider>
  );
}

// Safe to call from a page outside the provider (e.g. the landing page's
// own static Mascot) - returns a no-op celebrate so nothing crashes.
export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    return { state: { expression: "idle" as MascotExpression, message: null }, celebrate: () => {} };
  }
  return ctx;
}
