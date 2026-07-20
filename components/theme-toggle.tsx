"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResolvedTheme } from "@/lib/use-resolved-theme";

const STORAGE_KEY = "theme";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  root.classList.remove("light", "dark");
  root.classList.add(next);
  root.style.colorScheme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage may be unavailable (e.g. private browsing) — theme still
    // applies for this session, it just won't persist across reloads.
  }
}

export function ThemeToggle() {
  const resolvedTheme = useResolvedTheme();
  const label = resolvedTheme === "dark" ? "Switch to Ocean Light" : "Switch to Ocean Dark";

  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={toggleTheme}>
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
