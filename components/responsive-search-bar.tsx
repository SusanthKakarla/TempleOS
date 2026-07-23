"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";

interface ResponsiveSearchBarProps {
  pathname: string;
  placeholder?: string;
  paramName?: string;
  /** The FilterBottomSheet trigger (or any other action) rendered to the right of the input. */
  filtersSlot?: ReactNode;
  className?: string;
}

/**
 * Generic search input + optional filters trigger, sticky at the top of the
 * page content so it stays reachable while a long row list scrolls beneath
 * it. Isolated into its own component (same reasoning as the per-feature
 * `*-search-input.tsx` files it supersedes): typing only re-renders this bar,
 * not the row list.
 */
export function ResponsiveSearchBar({
  pathname,
  placeholder = "Search…",
  paramName = "search",
  filtersSlot,
  className,
}: ResponsiveSearchBarProps) {
  const [query, setQuery] = useDebouncedSearchParam(paramName, pathname);

  return (
    <div
      className={`sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none ${className ?? ""}`}
    >
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 pl-9 sm:h-9"
        />
      </div>
      {filtersSlot}
    </div>
  );
}
