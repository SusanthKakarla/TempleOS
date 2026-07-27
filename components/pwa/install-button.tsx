"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useInstall } from "./install-context";

interface InstallButtonProps {
  /** "menu-item" renders as a DropdownMenuItem (for the account menu); "button" renders a standalone Button (for the Settings page). */
  variant?: "menu-item" | "button";
  className?: string;
}

/**
 * The single reusable "Install TempleOS" control — renders nothing when
 * installation isn't available or the app is already installed, so it's safe
 * to mount in more than one place (account menu + Settings) without ever
 * showing two competing prompts at once.
 */
export function InstallButton({ variant = "button", className }: InstallButtonProps) {
  const t = useTranslations("pwaInstall");
  const { state, promptInstall } = useInstall();

  if (state === "installed" || state === "unsupported") {
    return null;
  }

  if (variant === "menu-item") {
    return (
      <DropdownMenuItem onClick={() => void promptInstall()}>
        <Download />
        {t("installAction")}
      </DropdownMenuItem>
    );
  }

  return (
    <Button onClick={() => void promptInstall()} className={className}>
      <Download />
      {t("installAction")}
    </Button>
  );
}
