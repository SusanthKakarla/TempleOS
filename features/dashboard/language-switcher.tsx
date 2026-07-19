"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportedLanguage } from "@/types/db";

const LOCALES: { value: SupportedLanguage; labelKey: "english" | "telugu" }[] = [
  { value: "en", labelKey: "english" },
  { value: "te", labelKey: "telugu" },
];

export function LanguageSwitcher() {
  const t = useTranslations("topbar");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSelect(next: SupportedLanguage) {
    if (next === locale || pending) return;
    setPending(true);
    try {
      await fetch("/api/account/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={t("language")}
            className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
          >
            <Globe className="size-4.5" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleSelect(item.value)}
            disabled={pending}
          >
            {item.value === locale ? <Check /> : <span className="size-4" />}
            {t(item.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
