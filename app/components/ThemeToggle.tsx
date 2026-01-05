"use client";

import { useTheme } from "@/app/lib/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-light)] hover:bg-[var(--bg-secondary)] transition-colors"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-[var(--text-primary)]" />
      ) : (
        <Sun className="w-5 h-5 text-[var(--text-primary)]" />
      )}
    </button>
  );
}
