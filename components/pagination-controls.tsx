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
  /** URL-driven mode (default for server-paginated lists): navigates via Link. Omit and pass `onPageChange` instead for a purely client-side list already held in memory. */
  pathname?: string;
  /** Lets two independently-paginated lists coexist on the same page/URL. Defaults to "page". Ignored in `onPageChange` mode. */
  paramName?: string;
  /** Local-state mode: called with the target page instead of navigating. Takes priority over `pathname` if both are somehow given. */
  onPageChange?: (page: number) => void;
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  pathname,
  paramName = "page",
  onPageChange,
}: PaginationControlsProps) {
  const searchParams = useSearchParams();
  const totalPages = computeTotalPages(totalCount, pageSize);

  function hrefForPage(target: number): string {
    if (!pathname) return "#";
    const next = mergeSearchParam(searchParams, paramName, target > 1 ? String(target) : null);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:justify-between">
      <span>
        {rangeStart}–{rangeEnd} of {totalCount}
      </span>
      <div className="flex items-center gap-1.5">
        {onPageChange ? (
          <button
            type="button"
            aria-label="Previous page"
            disabled={!canGoPrev}
            onClick={() => onPageChange(page - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "max-md:size-11")}
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : (
          <Link
            aria-label="Previous page"
            aria-disabled={!canGoPrev}
            tabIndex={canGoPrev ? undefined : -1}
            href={hrefForPage(page - 1)}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "max-md:size-11",
              !canGoPrev && "pointer-events-none opacity-50",
            )}
          >
            <ChevronLeft className="size-4" />
          </Link>
        )}
        <span className="px-1 tabular-nums">
          {page} / {totalPages}
        </span>
        {onPageChange ? (
          <button
            type="button"
            aria-label="Next page"
            disabled={!canGoNext}
            onClick={() => onPageChange(page + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "max-md:size-11")}
          >
            <ChevronRight className="size-4" />
          </button>
        ) : (
          <Link
            aria-label="Next page"
            aria-disabled={!canGoNext}
            tabIndex={canGoNext ? undefined : -1}
            href={hrefForPage(page + 1)}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "max-md:size-11",
              !canGoNext && "pointer-events-none opacity-50",
            )}
          >
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
