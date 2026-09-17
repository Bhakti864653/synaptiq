// The backend's `documents.status` values - kept here as the one place the
// frontend translates them into user-facing language, so no component ever
// shows a raw internal status string like "quiz_ready" directly.
export type DocumentStatus = "uploaded" | "processing" | "processed" | "quiz_ready" | "error";

export const PRACTICE_READY_STATUS: DocumentStatus = "quiz_ready";

// Mirrors backend/app/documents.py's PROCESSING_STALE_TIMEOUT_SECONDS (120s)
// - kept as a separate constant rather than importing across the
// frontend/backend boundary, but the two should be changed together.
export const PROCESSING_STALE_MS = 120_000;

export function isPending(status: string): boolean {
  return status === "uploaded" || status === "processing";
}

export function isPracticeReady(status: string): boolean {
  return status === PRACTICE_READY_STATUS;
}

export function isFailed(status: string): boolean {
  return status === "error";
}

// "processed" means text extraction finished - it does not mean a
// diagnostic quiz must be completed. Study Guide setup (either "Starting
// from zero" or "I know some of this") is what's actually still needed.
export function isReadyForSetup(status: string): boolean {
  return status === "processed";
}

// A document stuck at "processing" past PROCESSING_STALE_MS almost
// certainly had its request die mid-flight (a server restart, a killed
// worker) rather than genuinely still working - processing is one
// synchronous request/response with no legitimate reason to take this
// long. Only meaningful for status === "processing"; a missing timestamp
// (an older row from before this column existed) is treated as stalled
// immediately, same as the backend's _is_stale_processing.
export function isStalledProcessing(
  status: string,
  processingStartedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (status !== "processing") return false;
  if (!processingStartedAt) return true;
  const started = new Date(processingStartedAt).getTime();
  if (Number.isNaN(started)) return true;
  return now - started >= PROCESSING_STALE_MS;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "uploaded":
    case "processing":
      return "Processing";
    case "processed":
      return "Ready to set up";
    case "quiz_ready":
      return "Practice ready";
    case "error":
      return "Processing failed";
    default:
      return status;
  }
}
