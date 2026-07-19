"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import { cn } from "@/lib/utils";

const TOGGLE_FILTERS: {
  param: string;
  value: string;
  labelKey: "unread" | "today" | "thisWeek" | "english" | "telugu" | "donors" | "optedIn";
}[] = [
  { param: "unread", value: "true", labelKey: "unread" },
  { param: "period", value: "today", labelKey: "today" },
  { param: "period", value: "week", labelKey: "thisWeek" },
  { param: "language", value: "en", labelKey: "english" },
  { param: "language", value: "te", labelKey: "telugu" },
  { param: "donors", value: "true", labelKey: "donors" },
  { param: "optedIn", value: "true", labelKey: "optedIn" },
];

export function ConversationSearchFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useDebouncedSearchParam("search", pathname);
  const t = useTranslations("whatsappActivity.list");

  function toggleFilter(param: string, value: string) {
    const params = new URLSearchParams(searchParams);
    const isActive = params.get(param) === value;
    if (isActive) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2 border-b p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TOGGLE_FILTERS.map(({ param, value, labelKey }) => {
          const isActive = searchParams.get(param) === value;
          return (
            <Badge
              key={`${param}-${value}`}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none transition-all",
                isActive ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => toggleFilter(param, value)}
            >
              {t(`filters.${labelKey}`)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
