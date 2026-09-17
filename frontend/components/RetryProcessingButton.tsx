"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";

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
      } else {
        onResult({ status: "error", error_message: body.detail ?? "Processing failed." });
      }
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
