"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { InstallContext, type InstallState } from "./install-context";
import { InstallDialog } from "./install-dialog";

const DISMISS_STORAGE_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 7;
const DISMISS_EVENT = "pwa-install-dismiss-changed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Every read below is bridged through useSyncExternalStore (matching the
// pattern lib/use-resolved-theme.ts already uses) rather than a
// useState+useEffect pair — the server has no window/localStorage/UA to read,
// so getServerSnapshot supplies a safe, consistent default and the real value
// is picked up automatically once mounted, with no manual setState-in-effect.

function noopSubscribe(): () => void {
  return () => {};
}

function getIsIOSSnapshot(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh" but exposes multi-touch, unlike a real Mac.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
function getIsIOSServerSnapshot(): boolean {
  return false;
}

function subscribeStandalone(callback: () => void): () => void {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}
function getStandaloneSnapshot(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
function getStandaloneServerSnapshot(): boolean {
  return false;
}

function subscribeDismissed(callback: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DISMISS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function getDismissedSnapshot(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_STORAGE_KEY);
    return until !== null && Date.now() < Number(until);
  } catch {
    return false;
  }
}
function getDismissedServerSnapshot(): boolean {
  return false;
}

/**
 * Combines what the spec calls "InstallProvider" (context) and
 * "InstallManager" (beforeinstallprompt event wiring) into one client
 * component — this codebase has no separate event-bus/worker layer to split
 * them across, so a second component would just forward props for no
 * behavioral benefit. Mounted once in the root layout so the
 * `beforeinstallprompt` listener is attached before the browser can fire it.
 */
export function InstallProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("pwaInstall");
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  const isIOS = useSyncExternalStore(noopSubscribe, getIsIOSSnapshot, getIsIOSServerSnapshot);
  const installed = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getStandaloneServerSnapshot);
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissedSnapshot, getDismissedServerSnapshot);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setDeferredEvent(null);
      toast.success(t("installedToast"));
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [t]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      // Storage may be unavailable (e.g. private browsing) — the nudge just reappears next visit.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIOS) {
      setIosDialogOpen(true);
      return;
    }
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    setDeferredEvent(null);
    if (choice.outcome === "dismissed") {
      dismiss();
    }
  }, [deferredEvent, isIOS, dismiss]);

  const state: InstallState = installed
    ? "installed"
    : isIOS
      ? "ios-manual"
      : deferredEvent
        ? "installable"
        : "unsupported";

  return (
    <InstallContext.Provider value={{ state, isDismissed: dismissed, promptInstall, dismiss }}>
      {children}
      <InstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </InstallContext.Provider>
  );
}
