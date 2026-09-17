"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authFetch } from "@/lib/authFetch";
import { isPending } from "./documentStatus";

export type PolledDocument = {
  id: string;
  status: string;
  error_message?: string | null;
};

const POLL_INTERVAL_MS = 4000;

/**
 * Keeps a list of documents' status/error_message fresh without a manual
 * page refresh. While any document is "uploaded" or "processing", polls
 * Supabase directly (RLS-scoped, same read pattern this app already uses
 * for every other list) on an interval, and re-kicks off backend
 * processing for anything still stuck at "uploaded" - that covers the
 * upload flow's own initial /process request never having reached the
 * server at all (tab closed, network drop), which otherwise leaves a
 * document silently stuck forever with nothing left to retry it.
 *
 * Stops scheduling entirely once nothing is pending (derived fresh from
 * `documents` on every render, so it restarts automatically if a new
 * pending document is added later), and its cleanup runs on every
 * dependency change and on unmount, so there is never more than one timer
 * alive for a given caller. A poll that can't reach Supabase leaves
 * `documents` untouched and only sets `unreachable` - a document is never
 * flipped to a failed state locally just because one network round-trip
 * failed.
 */
export function useDocumentPolling<T extends PolledDocument>(
  documents: T[],
  setDocuments: Dispatch<SetStateAction<T[]>>,
) {
  const [unreachable, setUnreachable] = useState(false);
  const documentsRef = useRef(documents);

  // Keeps the ref current for `tick` (below) to read from a live interval
  // callback without re-running the polling effect on every render - the
  // assignment itself happens post-commit here, never during render.
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const pendingIds = documents.filter((d) => isPending(d.status)).map((d) => d.id);
  const pendingKey = pendingIds.slice().sort().join(",");

  useEffect(() => {
    if (!pendingKey) return;

    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const currentlyPending = documentsRef.current.filter((d) => isPending(d.status));
        if (currentlyPending.length === 0) return;

        const uploadedIds = currentlyPending
          .filter((d) => d.status === "uploaded")
          .map((d) => d.id);
        await Promise.all(
          uploadedIds.map((id) =>
            authFetch(`/documents/${id}/process`, { method: "POST" }).catch(() => {}),
          ),
        );

        const supabase = createClient();
        const { data, error } = await supabase
          .from("documents")
          .select("id, status, error_message")
          .in(
            "id",
            currentlyPending.map((d) => d.id),
          );

        if (cancelled) return;
        if (error || !data) {
          setUnreachable(true);
          return;
        }
        setUnreachable(false);
        setDocuments((prev) => {
          const byId = new Map(data.map((d) => [d.id, d]));
          return prev.map((d) => (byId.has(d.id) ? { ...d, ...byId.get(d.id) } : d));
        });
      } finally {
        inFlight = false;
      }
    }

    const intervalId = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // pendingKey (not the documents array itself) is the real dependency:
    // it only changes when the actual set of pending ids changes, which is
    // exactly when polling should restart or stop.
  }, [pendingKey, setDocuments]);

  return { unreachable };
}
