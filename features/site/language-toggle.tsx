"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setSiteLocale } from "./site-locale-action";
import type { SupportedLanguage } from "@/types/db";

const OPTIONS: SupportedLanguage[] = ["en", "te"];

/**
 * English / తెలుగు, as a compact segmented control in the site header.
 *
 * The choice is a cookie written by a server action, then `router.refresh()`
 * re-renders the current route on the server in the new language. That is why
 * nothing here holds the language in React state: the server is the only
 * source of it, so there is no client/server disagreement to hydrate around
 * and no flash of the previous language.
 *
 * Rendered as real buttons in a radio group rather than a dropdown — with two
 * options a menu costs an extra tap for no gain, and both labels stay visible
 * so a Telugu reader can find their language without knowing English.
 */
export function LanguageToggle({ accent, ink }: { accent: string; ink: string }) {
  const t = useTranslations("site.language");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: SupportedLanguage) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setSiteLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="flex shrink-0 items-center rounded-full border p-0.5"
      style={{ borderColor: `${ink}26` }}
    >
      {OPTIONS.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => choose(option)}
            className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            style={
              active
                ? { backgroundColor: `${accent}1F`, color: accent }
                : { color: `${ink}99` }
            }
          >
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}
