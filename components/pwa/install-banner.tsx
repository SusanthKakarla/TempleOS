"use client";

import { useTranslations } from "next-intl";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstall } from "./install-context";
import { InstallButton } from "./install-button";

/**
 * A dismissible nudge — not a global banner. Rendered once, on the Settings
 * page only, so there's never a second "install me" surface competing with
 * the account-menu InstallButton.
 */
export function InstallBanner() {
  const t = useTranslations("pwaInstall");
  const { state, isDismissed, dismiss } = useInstall();

  if (state === "installed" || state === "unsupported" || isDismissed) {
    return null;
  }

  return (
    <div className="glass-card flex items-start gap-3 rounded-2xl p-4 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Smartphone className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">{t("bannerTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("bannerDescription")}</p>
        </div>
        <InstallButton />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("dismiss")}
        onClick={dismiss}
        className="shrink-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
