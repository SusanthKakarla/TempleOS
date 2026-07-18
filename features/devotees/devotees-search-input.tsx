"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";

/**
 * Isolated from DevoteesTable so typing only re-renders this input, not the
 * full (potentially large, unbounded) row list beneath it.
 */
export function DevoteesSearchInput() {
  const [query, setQuery] = useDebouncedSearchParam("search", "/dashboard/devotees");

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by name or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
