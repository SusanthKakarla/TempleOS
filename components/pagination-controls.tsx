"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mergeSearchParam } from "@/lib/url-params";
import { computeTotalPages } from "@/lib/pagination";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pathname: string;
  /** Lets two independently-paginated lists coexist on the same page/URL. Defaults to "page". */
  paramName?: string;
}

export function PaginationControls({ page, pageSize, totalCount, pathname, paramName = "page" }: PaginationControlsProps) {
  const searchParams = useSearchParams();
  const totalPages = computeTotalPages(totalCount, pageSize);

  function hrefForPage(target: number): string {
    const next = mergeSearchParam(searchParams, paramName, target > 1 ? String(target) : null);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {rangeStart}–{rangeEnd} of {totalCount}
      </span>
      <div className="flex items-center gap-1.5">
        <Link
          aria-label="Previous page"
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          href={hrefForPage(page - 1)}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="px-1 tabular-nums">
          {page} / {totalPages}
        </span>
        <Link
          aria-label="Next page"
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          href={hrefForPage(page + 1)}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            page >= totalPages && "pointer-events-none opacity-50",
          )}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
