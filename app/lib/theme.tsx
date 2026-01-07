"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Funzioni helper fuori dal componente per evitare re-creazione
function updateColorScheme(newTheme: Theme) {
  if (typeof document === "undefined") return;
  let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  if (!metaColorScheme) {
    metaColorScheme = document.createElement('meta');
    metaColorScheme.setAttribute('name', 'color-scheme');
    document.head.appendChild(metaColorScheme);
  }
  metaColorScheme.setAttribute("content", newTheme);
}

function applyThemeToDOM(newTheme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (newTheme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  updateColorScheme(newTheme);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const savedTheme = localStorage.getItem("theme") as Theme | null;
  return savedTheme || "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inizializza con una funzione per evitare il setState nell'effect
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const mountedRef = useRef(false);

  // Applica il tema al DOM dopo il mount (senza setState)
  useEffect(() => {
    mountedRef.current = true;
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyThemeToDOM(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyThemeToDOM(newTheme);
      return newTheme;
    });
  }, []);

  // Sempre fornisci il context, anche durante SSR
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
