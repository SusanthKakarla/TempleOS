"use client";

import { useSyncExternalStore } from "react";

// Reads the light/dark class the beforeInteractive theme-init script (see
// components/theme-script.tsx) and the toggle button apply to <html>, kept
// in sync via useSyncExternalStore so there's no SSR/client hydration
// mismatch (server has no DOM to read; getServerSnapshot supplies the
// same default the CSS already falls back to).

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
