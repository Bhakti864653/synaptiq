"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "@/app/dashboard/LogoutButton";

// Profile, Settings and Log out, tucked under your name so the sidebar can
// stay down to the three places you actually study from.
export default function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-ink"
        >
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
        <span aria-hidden className="text-xs">▾</span>
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-44 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5 text-sm shadow-lg">
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-ink hover:bg-line/40"
          >
            Profile
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-ink hover:bg-line/40"
          >
            Settings
          </Link>
          <div className="my-1 border-t border-line" />
          <div className="px-3 py-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
