"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DocResult = { id: string; filename: string };
type ConceptResult = { id: string; name: string; document_id: string };

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocResult[]>([]);
  const [concepts, setConcepts] = useState<ConceptResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setDocs([]);
      setConcepts([]);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const [{ data: docData }, { data: conceptData }] = await Promise.all([
        supabase
          .from("documents")
          .select("id, filename")
          .ilike("filename", `%${q}%`)
          .limit(5),
        supabase
          .from("concepts")
          .select("id, name, document_id")
          .ilike("name", `%${q}%`)
          .limit(5),
      ]);
      setDocs(docData ?? []);
      setConcepts(conceptData ?? []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(documentId: string) {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/${documentId}`);
  }

  const hasResults = docs.length > 0 || concepts.length > 0;

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-sm flex-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search materials or concepts..."
        className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-brand"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-surface">
          {!hasResults && (
            <p className="px-3 py-2 text-sm text-ink-muted">No matches.</p>
          )}
          {docs.length > 0 && (
            <div className="flex flex-col">
              <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Documents
              </p>
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => goTo(d.id)}
                  className="px-3 py-2 text-left text-sm text-ink hover:bg-line/40"
                >
                  {d.filename}
                </button>
              ))}
            </div>
          )}
          {concepts.length > 0 && (
            <div className="flex flex-col pb-1">
              <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Concepts
              </p>
              {concepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goTo(c.document_id)}
                  className="px-3 py-2 text-left text-sm text-ink hover:bg-line/40"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
