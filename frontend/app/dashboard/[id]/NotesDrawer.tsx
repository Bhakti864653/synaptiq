"use client";

import { useState } from "react";

// This repo has no notes data model at all - no table, no RLS policy, no
// endpoint (checked before writing this). Per the standing rule against
// doing a production migration or bypassing RLS during a correction pass,
// this drawer is deliberately local-only: it never leaves the browser, and
// says so plainly rather than implying it's saved anywhere durable.
function storageKey(documentId: string) {
  return `synaptiq-local-notes:${documentId}`;
}

function readSavedNote(documentId: string): string {
  try {
    return localStorage.getItem(storageKey(documentId)) ?? "";
  } catch {
    return "";
  }
}

export default function NotesDrawer({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  // Seeded lazily, from the real click that opens this drawer - not an
  // effect. The textarea (and this value) never exist in the DOM until
  // then, so there's nothing for the server-rendered HTML to disagree
  // with; reading localStorage only ever happens in response to that real
  // browser interaction.
  const [value, setValue] = useState<string | null>(null);

  function handleToggle() {
    setOpen((wasOpen) => {
      const nowOpen = !wasOpen;
      if (nowOpen && value === null) setValue(readSavedNote(documentId));
      return nowOpen;
    });
  }

  function handleChange(next: string) {
    setValue(next);
    try {
      if (next.trim()) {
        localStorage.setItem(storageKey(documentId), next);
      } else {
        localStorage.removeItem(storageKey(documentId));
      }
    } catch {
      // ignore - the textarea itself still reflects what was typed
    }
  }

  return (
    <div className="border-t border-line pt-4">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <span aria-hidden>{open ? "−" : "+"}</span>
        Notes
        <span className="text-xs font-normal text-ink-muted">(saved on this device)</span>
      </button>
      {open && value !== null && (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Jot down anything worth remembering about this material - saved only in this browser, not to your account."
          rows={5}
          className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-brand"
        />
      )}
    </div>
  );
}
