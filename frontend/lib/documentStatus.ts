// The backend's `documents.status` values - kept here as the one place the
// frontend translates them into user-facing language, so no component ever
// shows a raw internal status string like "quiz_ready" directly.
export type DocumentStatus = "uploaded" | "processing" | "processed" | "quiz_ready" | "error";

export const PRACTICE_READY_STATUS: DocumentStatus = "quiz_ready";

export function isPending(status: string): boolean {
  return status === "uploaded" || status === "processing";
}

export function isPracticeReady(status: string): boolean {
  return status === PRACTICE_READY_STATUS;
}

export function isFailed(status: string): boolean {
  return status === "error";
}

export function isReadyForDiagnostic(status: string): boolean {
  return status === "processed";
}

export function statusLabel(status: string): string {
  switch (status) {
    case "uploaded":
    case "processing":
      return "Processing";
    case "processed":
      return "Ready for diagnostic";
    case "quiz_ready":
      return "Practice ready";
    case "error":
      return "Processing failed";
    default:
      return status;
  }
}
