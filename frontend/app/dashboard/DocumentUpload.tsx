"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ErrorMessage";
import Card from "@/components/Card";

export default function DocumentUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <Card className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">
        Upload a study material
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.pptx,.ppt,.docx,.doc,.txt"
        onChange={handleFileChange}
        disabled={uploading}
        className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-ink file:transition-opacity hover:file:opacity-90"
      />
      {uploading && <p className="text-sm text-ink-muted">Uploading...</p>}
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}
