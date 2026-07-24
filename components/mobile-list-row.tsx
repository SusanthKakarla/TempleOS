"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLongPress } from "@/hooks/use-long-press";
import { cn } from "@/lib/utils";

interface MobileListRowProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  /** Whether the list is currently in multi-select mode (shows a checkbox instead of `leading`). */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (checked: boolean) => void;
  onLongPress?: () => void;
}

/** Compact ~64px-tall row for high-density mobile list views (e.g. devotees) — an alternative to a desktop table row and to oversized mobile "cards". */
export function MobileListRow({
  leading,
  title,
  subtitle,
  badge,
  trailing,
  href,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onLongPress,
}: MobileListRowProps) {
  const longPressHandlers = useLongPress(() => onLongPress?.());

  const content = (
    <div
      className={cn(
        "flex min-h-16 items-center gap-3 px-3 py-2 transition-colors",
        selected ? "bg-accent" : "active:bg-accent/60",
      )}
      {...longPressHandlers}
    >
      {selectMode ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect?.(checked === true)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${title}`}
          className="size-5 shrink-0"
        />
      ) : (
        <div className="shrink-0">{leading}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );

  if (href && !selectMode) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return (
    <div
      role={selectMode ? "checkbox" : undefined}
      aria-checked={selectMode ? selected : undefined}
      onClick={selectMode ? () => onToggleSelect?.(!selected) : undefined}
    >
      {content}
    </div>
  );
}
