"use client";

import { createContext, useContext } from "react";

export type InstallState =
  | "installed"
  | "installable"
  | "ios-manual"
  | "unsupported";

export interface InstallContextValue {
  /** Current installation/availability state — drives what (if anything) an InstallButton renders. */
  state: InstallState;
  /** True once the user has dismissed the install nudge (persisted for a few days). */
  isDismissed: boolean;
  /** Triggers the native install prompt (Android/desktop Chromium) or opens the iOS instructions dialog. No-op if `state` isn't "installable"/"ios-manual". */
  promptInstall: () => Promise<void>;
  /** Suppresses passive install nudges (e.g. InstallBanner) for a few days. Never hides the explicit Install button/menu item. */
  dismiss: () => void;
}

export const InstallContext = createContext<InstallContextValue | null>(null);

export function useInstall(): InstallContextValue {
  const ctx = useContext(InstallContext);
  if (!ctx) {
    throw new Error("useInstall must be used within an InstallProvider");
  }
  return ctx;
}
