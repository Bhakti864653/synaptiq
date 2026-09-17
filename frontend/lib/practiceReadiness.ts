import { isPending, isFailed, isPracticeReady, isReadyForSetup } from "./documentStatus";

export type ReadinessCode =
  | "READY"
  | "NO_DOCUMENTS"
  | "PROCESSING"
  | "PROCESSING_FAILED"
  | "SETUP_REQUIRED";

export type DocSummary = {
  id: string;
  status: string;
  error_message?: string | null;
  processing_started_at?: string | null;
};

export type Readiness = { code: ReadinessCode; documentId: string | null };

// Mirrors backend/app/quiz.py's _raise_practice_not_ready priority exactly,
// so the frontend never shows "you can practice" while the backend would
// refuse, or vice versa - this is the one shared definition of "practice
// ready" for the client side. At least one PRACTICE_READY_STATUS document
// wins regardless of what state any other document is in; only when none
// are ready do we explain what's blocking, checking in-flight work before
// permanent failure before "needs setup," matching the backend.
//
// SETUP_REQUIRED (not "diagnostic required"): a "processed" document only
// means text extraction finished, not that a diagnostic quiz specifically
// must be completed - Study Guide setup lets the user choose "Starting
// from zero" (no diagnostic at all) or "I know some of this" (which does
// take one); either path is what actually reaches quiz_ready.
export function classifyPracticeReadiness(documents: DocSummary[]): Readiness {
  if (documents.some((d) => isPracticeReady(d.status))) {
    return { code: "READY", documentId: null };
  }

  const processing = documents.find((d) => isPending(d.status));
  if (processing) return { code: "PROCESSING", documentId: processing.id };

  const failed = documents.find((d) => isFailed(d.status));
  if (failed) return { code: "PROCESSING_FAILED", documentId: failed.id };

  const processed = documents.find((d) => isReadyForSetup(d.status));
  if (processed) return { code: "SETUP_REQUIRED", documentId: processed.id };

  return { code: "NO_DOCUMENTS", documentId: null };
}
