"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";

// FastAPI's `detail` is either a plain string or a structured object (as
// this endpoint's own 409 uses: {code, message}) - never render either form
// directly, since an object detail passed straight into JSX throws "Objects
// are not valid as a React child".
function extractDetailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (
    detail &&
    typeof detail === "object" &&
    typeof (detail as { message?: unknown }).message === "string"
  ) {
    return (detail as { message: string }).message;
  }
  return fallback;
}

function isAlreadyProcessing(detail: unknown): boolean {
  return (
    !!detail &&
    typeof detail === "object" &&
    (detail as { code?: unknown }).code === "ALREADY_PROCESSING"
  );
}

// Calls the same POST /documents/{id}/process endpoint the initial upload
// uses - retrying processing IS re-calling it, there is no separate retry
// endpoint. That request is synchronous end to end (extract, chunk, set
// status), so its own response already carries the real outcome - no need
// to poll afterward to find out what happened.
export default function RetryProcessingButton({
  documentId,
  onResult,
}: {
  documentId: string;
  onResult: (result: { status: "processed" | "error"; error_message: string | null }) => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/process`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        onResult({ status: "processed", error_message: null });
        return;
      }
      if (res.status === 409 && isAlreadyProcessing(body.detail)) {
        // Someone else's request is genuinely still in flight - this is
        // not a failure, so the document must stay exactly as it is
        // ("processing"), never flipped to "error" underneath it.
        setError(
          extractDetailMessage(body.detail, "This document is already being processed."),
        );
        return;
      }
      onResult({
        status: "error",
        error_message: extractDetailMessage(body.detail, "Processing failed."),
      });
    } catch (e) {
      // A network failure here is genuinely inconclusive - we don't know
      // whether the request landed, so we don't touch the document's
      // status at all, just show a recoverable message next to the button.
      setError(friendlyErrorMessage(e));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onClick={handleRetry} disabled={retrying} className="w-fit">
        {retrying ? "Retrying..." : "Retry processing"}
      </Button>
      {error && <ErrorMessage message={error} onRetry={handleRetry} />}
    </div>
  );
}
