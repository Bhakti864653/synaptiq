"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DocumentUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to upload.");
      setUploading(false);
      return;
    }

    const storagePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("study-materials")
      .upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
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
      setError(insertError?.message ?? "Could not save document record.");
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
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.pptx,.ppt,.docx,.doc,.txt"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
