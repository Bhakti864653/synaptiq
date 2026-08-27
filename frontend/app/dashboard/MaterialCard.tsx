"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import MasteryRing from "@/components/MasteryRing";

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
  mastery,
}: {
  id: string;
  filename: string;
  status: string;
  mastery: number | null;
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

  return (
    <Link href={`/dashboard/${id}`}>
      <Card className="flex items-center gap-4 py-4 transition-transform hover:-translate-y-0.5 hover:bg-line/30">
        <MasteryRing score={mastery} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-ink">{filename}</div>
          <div className="font-mono text-xs text-ink-muted">{status}</div>
        </div>
        <button
          onClick={handleDeleteClick}
          onBlur={() => setConfirming(false)}
          disabled={deleting}
          aria-label={confirming ? "Confirm delete" : "Delete material"}
          className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            confirming
              ? "bg-weak text-white hover:opacity-90"
              : "text-ink-muted hover:bg-weak/10 hover:text-weak"
          }`}
        >
          {confirming ? "Confirm?" : <TrashIcon />}
        </button>
      </Card>
    </Link>
  );
}
