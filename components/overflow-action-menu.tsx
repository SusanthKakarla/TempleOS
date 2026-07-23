"use client";

import { MoreVertical } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OverflowActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface OverflowActionMenuProps {
  items: OverflowActionMenuItem[];
  label?: string;
  /** Stops the triggering click from bubbling to an ancestor row's own onClick (e.g. a tappable table row). */
  stopPropagation?: boolean;
  /** Custom trigger element (e.g. an entire tappable mobile table row) instead of the default three-dot icon button. */
  trigger?: ReactElement;
}

/** Row-action menu — the shared replacement for inline per-row Edit/Delete buttons across every list/table feature. Defaults to a three-dot icon trigger; pass `trigger` to anchor it to something else (e.g. a whole tappable row). */
export function OverflowActionMenu({ items, label = "More actions", stopPropagation = true, trigger }: OverflowActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              onClick={(event) => {
                if (stopPropagation) event.stopPropagation();
              }}
            />
          )
        }
      >
        {trigger ? undefined : <MoreVertical className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant={item.variant}
            disabled={item.disabled}
            onClick={(event) => {
              if (stopPropagation) event.stopPropagation();
              item.onClick();
            }}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
