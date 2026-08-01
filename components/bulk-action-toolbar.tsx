"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionToolbarProps {
  count: number;
  selectedLabel: string;
  deleteLabel: string;
  onDelete: () => void;
  deleteDisabled?: boolean;
  className?: string;
}

/** Shared bulk-selection action bar for list/table pages — appears above the table once one or more rows are selected. Shared by Donations and Devotees so both stay visually consistent; each page still wires up its own selection state and delete handler independently. */
export function BulkActionToolbar({ count, selectedLabel, deleteLabel, onDelete, deleteDisabled, className }: BulkActionToolbarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-medium">{selectedLabel}</p>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={deleteDisabled}
        className="gap-1.5 max-sm:h-11 max-sm:px-4"
      >
        <Trash2 className="size-4" />
        {deleteLabel}
      </Button>
    </div>
  );
}
