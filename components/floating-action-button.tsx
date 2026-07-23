import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** Breakpoint at and above which the FAB hides (the page's own header action takes over instead). Defaults to "lg" — shown on mobile + tablet, matching the new 3-tier layout where the header's inline action button becomes `hidden lg:inline-flex`. */
  hideAt?: "md" | "lg";
  className?: string;
}

/**
 * Docked bottom-right circular action button, thumb-reachable one-handed.
 * Renders as a single `<Button>` element so it can be passed directly as a
 * dialog's `trigger` prop (e.g. `<DevoteeFormDialog trigger={<FloatingActionButton .../>} />`)
 * — previously this exact markup was copy-pasted verbatim across
 * devotees/donations/events tables.
 */
export function FloatingActionButton({ icon, label, onClick, hideAt = "lg", className }: FloatingActionButtonProps) {
  return (
    <Button
      size="icon-lg"
      onClick={onClick}
      className={cn(
        "fixed right-4 bottom-4 z-40 rounded-full shadow-lg",
        hideAt === "md" ? "md:hidden" : "lg:hidden",
        className,
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
