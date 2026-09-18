"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SynaptiqMark } from "@/components/logo";

const mainLinks = [
  { href: "/dashboard", label: "Study Materials" },
  { href: "/dashboard/practice", label: "Practice" },
  { href: "/dashboard/weak-spots", label: "Weak Spots" },
  { href: "/dashboard/ask", label: "Ask a Tutor" },
  { href: "/dashboard/progress", label: "Progress/History" },
];

const utilityLinks = [
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Settings" },
];

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // A stored preference is scoped to whatever viewport it was set on -
    // a sidebar left open on desktop must not also force it open (and the
    // page into real horizontal overflow, since the sidebar's own fixed
    // 224px width doesn't fit) on a phone. Mobile-width always starts
    // collapsed regardless of any stored value; the stored preference
    // still governs everything at tablet/desktop widths as before.
    if (window.innerWidth < 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setReady(true);
      return;
    }
    try {
      const stored = localStorage.getItem("sidebar-open");
      if (stored !== null) setOpen(stored === "true");
    } catch {
      // ignore — falls back to the default open state
    }
    setReady(true);
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-open", String(next));
      } catch {
        // ignore — preference just won't persist this session
      }
      return next;
    });
  }

  // Avoid a flash of the wrong state before localStorage is read.
  if (!ready) return null;

  if (!open) {
    return (
      <button
        onClick={toggle}
        aria-label="Open sidebar"
        className="m-2 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-[10px_4px_10px_4px] border border-line text-ink-muted transition-colors hover:border-brand hover:text-brand"
      >
        <HamburgerIcon />
      </button>
    );
  }

  return (
    <nav
      className="flex w-56 shrink-0 flex-col gap-1 border-r border-line/60 p-4 backdrop-blur-sm"
      style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <SynaptiqMark size={20} className="text-ink-muted" title="Synaptiq" />
        <button
          onClick={toggle}
          aria-label="Collapse sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-[10px_4px_10px_4px] text-ink-muted transition-colors hover:bg-line/40 hover:text-ink"
        >
          <HamburgerIcon />
        </button>
      </div>
      {mainLinks.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-[10px_4px_10px_4px] px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand text-brand-ink"
                : "text-ink-muted hover:bg-line/40 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line/60 pt-2">
        {utilityLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-[10px_4px_10px_4px] px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? "text-brand font-medium"
                  : "text-ink-muted/70 hover:text-ink-muted"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
