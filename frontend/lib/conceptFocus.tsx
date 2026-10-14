"use client";

import { createContext, useContext } from "react";

export type ConceptFocus = { id: string; name: string };

// The concept picked on the material page. Each step (quiz, study guide,
// practice, flashcards) reads it to show that concept first; outside the
// material page there is no focus and the steps show everything.
const ConceptFocusContext = createContext<ConceptFocus | null>(null);

export const ConceptFocusProvider = ConceptFocusContext.Provider;

export function useConceptFocus(): ConceptFocus | null {
  return useContext(ConceptFocusContext);
}
