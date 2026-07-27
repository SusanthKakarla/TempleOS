"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemeKey } from "@/lib/themes/types";
import { ThemeBackdrop } from "./theme-backdrop";

interface ThemeContextValue {
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Bridges a Server Component shell (dashboard-shell.tsx, which renders the
 * background) with whichever page is currently nested inside it (which
 * knows its own themeKey but can't hand it "up" to an ancestor Server
 * Component directly — RSC data only flows down). Every dashboard page
 * renders <SetPageTheme themeKey="..."> once; <BackgroundManager> — rendered
 * once by the shell — reads the resulting value here.
 */
export function ThemeProvider({ defaultThemeKey, children }: { defaultThemeKey: ThemeKey; children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(defaultThemeKey);
  return <ThemeContext.Provider value={{ themeKey, setThemeKey }}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within a ThemeProvider");
  return ctx;
}

/** Declares the current page's theme. Renders nothing — pure side effect via context. */
export function SetPageTheme({ themeKey }: { themeKey: ThemeKey }) {
  const { setThemeKey } = useThemeContext();
  useEffect(() => {
    setThemeKey(themeKey);
  }, [themeKey, setThemeKey]);
  return null;
}

/** Renders whichever background the current page declared via <SetPageTheme>. One instance per shell (dashboard-shell.tsx / super-admin-shell.tsx). */
export function BackgroundManager() {
  const { themeKey } = useThemeContext();
  return <ThemeBackdrop themeKey={themeKey} />;
}
