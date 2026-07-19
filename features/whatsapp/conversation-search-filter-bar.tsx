"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import { cn } from "@/lib/utils";

const TOGGLE_FILTERS: { param: string; value: string; label: string }[] = [
  { param: "unread", value: "true", label: "Unread" },
  { param: "period", value: "today", label: "Today" },
  { param: "period", value: "week", label: "This week" },
  { param: "language", value: "en", label: "English" },
  { param: "language", value: "te", label: "Telugu" },
  { param: "donors", value: "true", label: "Donors" },
  { param: "optedIn", value: "true", label: "Opted-in" },
];

export function ConversationSearchFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useDebouncedSearchParam("search", pathname);

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
          placeholder="Search name, phone, or message..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TOGGLE_FILTERS.map(({ param, value, label }) => {
          const isActive = searchParams.get(param) === value;
          return (
            <Badge
              key={`${param}-${value}`}
              variant={isActive ? "default" : "outline"}
              className={cn("cursor-pointer select-none", !isActive && "text-muted-foreground")}
              onClick={() => toggleFilter(param, value)}
            >
              {label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
