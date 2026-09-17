"use client";

import { useState } from "react";
import { useDocumentPolling } from "@/lib/useDocumentPolling";
import MaterialCard from "./MaterialCard";

export type Document = {
  id: string;
  filename: string;
  status: string;
  error_message: string | null;
  processing_started_at: string | null;
};

// Renders the materials grid client-side (rather than the plain server-
// rendered list this replaced) so it can poll for status changes on its
// own - a document stuck "uploaded"/"processing" updates itself in place
// once ready or failed, with no manual browser refresh needed.
export default function MaterialsBoard({
  documents: initialDocuments,
  conceptsByDocument,
  masteryByConceptId,
}: {
  documents: Document[];
  conceptsByDocument: Map<string, string[]>;
  masteryByConceptId: Map<string, number>;
}) {
  // Reconciles local state with a freshly server-fetched `documents` prop
  // (a new upload, a delete, or any status/error change picked up after a
  // router.refresh()) without an effect - this is React's own documented
  // pattern for "adjust state when a prop changes": compare against the
  // last-seen prop during render itself and resync immediately, rather
  // than in a useEffect that would run one render late. `initialDocuments`
  // is a new array reference every time the parent Server Component
  // re-fetches, so this only fires when the data actually changes, not on
  // every unrelated re-render (e.g. a local poll's own setDocuments call).
  const [prevDocuments, setPrevDocuments] = useState(initialDocuments);
  const [documents, setDocuments] = useState(initialDocuments);
  if (initialDocuments !== prevDocuments) {
    setPrevDocuments(initialDocuments);
    setDocuments(initialDocuments);
  }

  useDocumentPolling(documents, setDocuments);

  function averageMastery(conceptIds: string[]) {
    if (!conceptIds.length) return null;
    const total = conceptIds.reduce(
      (sum, id) => sum + (masteryByConceptId.get(id) ?? 0),
      0,
    );
    return Math.round(total / conceptIds.length);
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc, i) => {
        const docMastery = averageMastery(conceptsByDocument.get(doc.id) ?? []);
        const featured = i === 0;
        const wide = !featured && (i - 1) % 3 === 0;
        const span = featured ? "col-span-full" : wide ? "lg:col-span-2" : undefined;
        return (
          <li key={doc.id} className={span}>
            <MaterialCard
              id={doc.id}
              filename={doc.filename}
              status={doc.status}
              errorMessage={doc.error_message}
              processingStartedAt={doc.processing_started_at}
              mastery={docMastery}
              featured={featured}
              onRetried={(result) =>
                setDocuments((prev) =>
                  prev.map((d) => (d.id === doc.id ? { ...d, ...result } : d)),
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
