"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ErrorMessage";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";

type Mode = "file" | "paste";

export default function DocumentUpload({
  collapsedByDefault = false,
}: {
  collapsedByDefault?: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [mode, setMode] = useState<Mode>("file");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  }

  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = pasteText.trim();
    if (!text) return;
    const title = pasteTitle.trim() || "Pasted notes";
    const file = new File([text], `${title}.txt`, { type: "text/plain" });
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError({
        message: "You must be logged in to upload.",
        retry: () => uploadFile(file),
      });
      setUploading(false);
      return;
    }

    const storagePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("study-materials")
      .upload(storagePath, file);

    if (uploadError) {
      setError({ message: uploadError.message, retry: () => uploadFile(file) });
      setUploading(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: storagePath,
        file_type: file.type || "unknown",
        status: "uploaded",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setError({
        message: insertError?.message ?? "Could not save document record.",
        retry: () => uploadFile(file),
      });
      setUploading(false);
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setPasteTitle("");
    setPasteText("");
    router.refresh();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/${inserted.id}/process`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      )
        .catch(() => {
          // Non-fatal: the document stays visible with status "uploaded"
          // and can be retried; the dashboard will simply keep polling.
        })
        .finally(() => {
          router.refresh();
        });
    }

    setUploading(false);
  }

  if (!expanded) {
    return (
      <Button variant="secondary" onClick={() => setExpanded(true)} className="w-fit">
        + Add material
      </Button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-line p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              mode === "file" ? "bg-brand text-brand-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Upload a file
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              mode === "paste" ? "bg-brand text-brand-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Paste text
          </button>
        </div>
        {collapsedByDefault && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>

      {mode === "file" ? (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.ppt,.docx,.doc,.txt"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-ink file:transition-opacity hover:file:opacity-90"
        />
      ) : (
        <form onSubmit={handlePasteSubmit} className="flex flex-col gap-2">
          <Input
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="Title (e.g. Chapter 3 notes)"
            disabled={uploading}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your study notes here..."
            disabled={uploading}
            rows={6}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-brand"
          />
          <Button type="submit" disabled={uploading || !pasteText.trim()} className="w-fit">
            {uploading ? "Adding..." : "Add notes"}
          </Button>
        </form>
      )}

      {uploading && mode === "file" && (
        <p className="text-sm text-ink-muted">Uploading...</p>
      )}
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}
