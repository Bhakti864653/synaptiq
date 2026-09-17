"use client";

import { useState } from "react";
import { useDocumentPolling } from "@/lib/useDocumentPolling";
import MaterialCard from "./MaterialCard";

type Document = {
  id: string;
  filename: string;
  status: string;
  error_message: string | null;
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
  const [documents, setDocuments] = useState(initialDocuments);
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
