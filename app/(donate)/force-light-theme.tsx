"use client";

import { useLayoutEffect } from "react";

// SSR has no DOM to mutate, and React warns if useLayoutEffect runs there —
// this route is always client-rendered past hydration anyway, so the guard
// just silences that warning rather than changing behavior.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : () => {};

/**
 * The root layout's theme-init script sets `.dark` on <html> from the
 * visitor's OS/browser preference for the app's own (dashboard) theme — but
 * this donate route must always show the temple's warm palette, never the
 * app's dark theme. Scoping CSS custom properties on a wrapper div (see
 * `.donate-theme-light` in globals.css) isn't enough on its own: Base UI's
 * Dialog portals its popup to `document.body`, a sibling of that wrapper
 * rather than a descendant, so the popup would still inherit `.dark`'s
 * tokens and every `dark:` Tailwind variant on shared primitives (Input,
 * Checkbox, Button, ...) would still fire. Removing `.dark` from <html>
 * itself while this route is mounted fixes it everywhere at once,
 * including inside portals. Runs in a layout effect (not a regular effect)
 * so it lands before the first paint — no flash of the dark theme on a
 * fresh load from a WhatsApp link.
 */
export function ForceLightTheme() {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;

    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";

    return () => {
      if (hadDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      }
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  return null;
}
