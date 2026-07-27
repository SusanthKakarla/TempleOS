"use client";

import { useEffect } from "react";

/** Registers the minimal offline-fallback service worker (public/sw.js). Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures (unsupported browser, blocked by an extension, etc.)
        // shouldn't be user-facing — the app works fully without a service worker.
      });
    }
  }, []);

  return null;
}
