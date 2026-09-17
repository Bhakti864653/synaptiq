"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MasteryRing from "@/components/MasteryRing";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import RetryProcessingButton from "@/components/RetryProcessingButton";
import {
  isPending,
  isFailed,
  isPracticeReady,
  isReadyForSetup,
  isStalledProcessing,
} from "@/lib/documentStatus";

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v14H6V3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MaterialCard({
  id,
  filename,
  status,
  errorMessage = null,
  processingStartedAt = null,
  mastery,
  onRetried,
}: {
  id: string;
  filename: string;
  status: string;
  errorMessage?: string | null;
  processingStartedAt?: string | null;
  mastery: number | null;
  onRetried?: (result: { status: "processed" | "error"; error_message: string | null }) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      return;
    }

    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});

    router.refresh();
  }

  // A single outer <Link> wrapping the whole row (the row's previous
  // shape) would nest this delete <button> inside an <a> - invalid HTML
  // and unreliable keyboard/click behavior. The row is a plain <div>;
  // the filename/status area is its own <Link>, and delete is a sibling
  // <button>, so nothing is ever nested inside anything else interactive.
  return (
    <div className="group flex items-center gap-4 py-3 transition-colors hover:bg-line/20">
      <Link
        href={`/dashboard/${id}`}
        className="flex min-w-0 flex-1 items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="shrink-0 text-ink-muted">
          <FileIcon />
        </span>
        <MasteryRing score={mastery} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{filename}</div>
          {isPending(status) &&
            (isStalledProcessing(status, processingStartedAt) ? (
              <div className="flex flex-col items-start gap-1.5">
                <p className="text-xs text-weak">Processing appears stuck.</p>
                {onRetried && (
                  <div onClick={(e) => e.preventDefault()}>
                    <RetryProcessingButton documentId={id} onResult={onRetried} />
                  </div>
                )}
              </div>
            ) : (
              <ProcessingIndicator />
            ))}
          {isReadyForSetup(status) && (
            <p className="text-xs font-medium text-brand">Set up material &rarr;</p>
          )}
          {isPracticeReady(status) && (
            <p className="text-xs font-medium text-[var(--mastered)]">
              Ready for personalized practice
            </p>
          )}
          {isFailed(status) && (
            <div className="flex flex-col items-start gap-1.5">
              <p className="text-xs text-weak">{errorMessage ?? "Processing failed."}</p>
              {onRetried && (
                <div onClick={(e) => e.preventDefault()}>
                  <RetryProcessingButton documentId={id} onResult={onRetried} />
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={handleDeleteClick}
        onBlur={() => setConfirming(false)}
        disabled={deleting}
        aria-label={confirming ? "Confirm delete" : "Delete material"}
        className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
          confirming
            ? "bg-weak text-white hover:opacity-90"
            : "text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-weak/10 hover:text-weak focus-visible:opacity-100"
        }`}
      >
        {confirming ? "Confirm?" : <TrashIcon />}
      </button>
    </div>
  );
}
