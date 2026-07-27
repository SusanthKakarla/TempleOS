"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInstall } from "./install-context";
import { InstallBanner } from "./install-banner";

/** "Installation Status" card for the Settings → Application page. */
export function PWAStatus() {
  const t = useTranslations("pwaInstall");
  const { state } = useInstall();

  const isInstalled = state === "installed";

  return (
    <div className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MonitorSmartphone className="size-4 text-muted-foreground" />
          {t("statusTitle")}
        </div>
        <Badge variant={isInstalled ? "default" : "outline"}>
          {isInstalled ? (
            <>
              <CheckCircle2 className="size-3" />
              {t("statusInstalled")}
            </>
          ) : (
            t("statusNotInstalled")
          )}
        </Badge>
      </div>

      {isInstalled ? (
        <p className="text-sm text-muted-foreground">{t("statusInstalledDescription")}</p>
      ) : state === "unsupported" ? (
        <p className="text-sm text-muted-foreground">{t("statusUnsupported")}</p>
      ) : (
        <InstallBanner />
      )}
    </div>
  );
}
