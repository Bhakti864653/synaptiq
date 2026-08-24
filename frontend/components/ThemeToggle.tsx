"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-brand hover:text-brand"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-6.66 1.41-1.41M5.93 18.07l-1.41 1.41m0-14.83 1.41 1.41M18.07 18.07l1.41 1.41M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
        </svg>
      )}
    </button>
  );
}
