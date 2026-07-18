"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";

/**
 * Isolated from DonationsTable so typing only re-renders this input, not the
 * full (potentially large, unbounded) row list beneath it.
 */
export function DonationsSearchInput() {
  const [query, setQuery] = useDebouncedSearchParam("search", "/dashboard/donations");

  return (
    <div className="relative max-w-sm flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by donor name or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
