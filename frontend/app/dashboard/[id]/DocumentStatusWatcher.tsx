"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDocumentPolling } from "@/lib/useDocumentPolling";
import { isFailed, isPending, isStalledProcessing } from "@/lib/documentStatus";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import RetryProcessingButton from "@/components/RetryProcessingButton";

// Sits at the top of a document's detail page. The page itself is a Server
// Component whose tabs (Study Guide/Quiz/Tutor/Flashcards) depend on the
// document's status - rather than duplicating that tab logic client-side,
// this just polls the one document and asks the server page to re-render
// (router.refresh()) the moment the status actually changes, so a document
// that finishes processing while this page is open updates itself with no
// manual reload.
//
// The parent renders this with `key={id}` so that navigating between two
// different documents' pages (Next.js reuses the [id] route's component
// tree rather than remounting it) forces a fresh instance with its own
// state seeded from that document's own props, instead of needing an
// effect to detect the id change and reset state after the fact.
export default function DocumentStatusWatcher({
  id,
  status: initialStatus,
  errorMessage: initialErrorMessage,
  processingStartedAt: initialProcessingStartedAt,
}: {
  id: string;
  status: string;
  errorMessage: string | null;
  processingStartedAt: string | null;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState([
    {
      id,
      status: initialStatus,
      error_message: initialErrorMessage,
      processing_started_at: initialProcessingStartedAt,
    },
  ]);
  const { unreachable } = useDocumentPolling(documents, setDocuments);

  const current = documents[0];

  useEffect(() => {
    if (current.status !== initialStatus) {
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.status]);

  if (isPending(current.status)) {
    if (isStalledProcessing(current.status, current.processing_started_at)) {
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-weak">
            Processing appears stuck. It&apos;s been running longer than expected.
          </p>
          <RetryProcessingButton
            documentId={id}
            onResult={(result) =>
              setDocuments([
                {
                  id,
                  status: result.status,
                  error_message: result.error_message,
                  processing_started_at: null,
                },
              ])
            }
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <ProcessingIndicator label="We're preparing your material." />
        {unreachable && (
          <p className="text-xs text-ink-muted">
            Having trouble checking for updates - this will keep retrying automatically.
          </p>
        )}
      </div>
    );
  }

  if (isFailed(current.status)) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-weak">
          Processing failed: {current.error_message ?? "Unknown error."}
        </p>
        <RetryProcessingButton
          documentId={id}
          onResult={(result) =>
            setDocuments([
              {
                id,
                status: result.status,
                error_message: result.error_message,
                processing_started_at: null,
              },
            ])
          }
        />
      </div>
    );
  }

  return null;
}
