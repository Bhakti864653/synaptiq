"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border text-lg hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
