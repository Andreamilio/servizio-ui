"use client";

import { useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeContext } from "@/app/lib/theme";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const context = useContext(ThemeContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante SSR o se il context non è disponibile, renderizza un placeholder
  if (!mounted || !context) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-light)]">
        <Sun className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
      </div>
    );
  }

  const { theme, toggleTheme } = context;

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-light)] hover:opacity-80 transition-opacity"
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
