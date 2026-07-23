"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from "@/components/ui/sheet";

interface FilterBottomSheetProps {
  title?: string;
  /** Number of currently-active filters — shown as a badge on the trigger button so users can tell filters are applied without opening the sheet. */
  activeCount?: number;
  /** Filter field UI, rendered inside the scrollable sheet body. */
  children: ReactNode;
  /** Clears every filter and applies immediately. */
  onReset: () => void;
  /** Commits whatever the caller has staged (the caller owns pending state per-field; this just signals "close and apply"). */
  onApply: () => void;
  /** Fires whenever the sheet opens/closes — use this to resync any locally-staged filter state from the current applied values each time it opens. */
  onOpenChange?: (open: boolean) => void;
}

/** Bottom-sheet filter panel — the shared "Filters" trigger + sheet used by every list/table page instead of always-visible filter controls. */
export function FilterBottomSheet({
  title = "Filters",
  activeCount = 0,
  children,
  onReset,
  onApply,
  onOpenChange,
}: FilterBottomSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <SheetTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Filter className="size-4" />
            {title}
            {activeCount > 0 && (
              <Badge variant="default" className="ml-0.5 size-4.5 justify-center rounded-full p-0 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="max-h-[55vh] overflow-y-auto px-4">{children}</div>
        <SheetFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            Reset
          </Button>
          <SheetClose
            render={
              <Button
                className="flex-1"
                onClick={() => {
                  onApply();
                }}
              >
                Apply
              </Button>
            }
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
