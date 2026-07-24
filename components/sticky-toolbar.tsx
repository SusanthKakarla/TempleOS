import { cn } from "@/lib/utils";

interface StickyToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a page's title/actions row and its search/filter row into one sticky
 * group that stays pinned to the top of the scrolling page content while only
 * the list/table beneath it scrolls. Use with `<ResponsiveSearchBar sticky={false}>`
 * so the two don't double up their own sticky/background treatments.
 */
export function StickyToolbar({ children, className }: StickyToolbarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 space-y-3 border-b bg-background/95 px-4 pt-1 pb-3 backdrop-blur sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
