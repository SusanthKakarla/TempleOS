"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { mergeSearchParam } from "@/lib/url-params";

interface SortableTableHeadProps {
  column: string;
  label: string;
  currentSort?: string;
  currentDir?: "asc" | "desc";
  pathname: string;
  className?: string;
}

export function SortableTableHead({
  column,
  label,
  currentSort,
  currentDir,
  pathname,
  className,
}: SortableTableHeadProps) {
  const searchParams = useSearchParams();
  const isActive = currentSort === column;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";

  let next = mergeSearchParam(searchParams, "sort", column);
  next = mergeSearchParam(next, "dir", nextDir);
  next = mergeSearchParam(next, "page", null);
  const qs = next.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  const Icon = isActive ? (currentDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <TableHead className={className}>
      <Link href={href} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className={cn("size-3.5", isActive ? "text-foreground" : "text-muted-foreground/50")} />
      </Link>
    </TableHead>
  );
}
