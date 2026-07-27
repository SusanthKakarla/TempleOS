import { cn } from "@/lib/utils";

interface StickyToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The shared "Dashboard Header Card" — wraps a page's title/actions row and
 * its search/filter row into one premium rounded card that stays pinned to
 * the top of the scrolling page content while the list/table beneath it
 * (in its own bounded, independently-scrolling container — see
 * `components/ui/table.tsx`) scrolls underneath. Use with
 * `<ResponsiveSearchBar sticky={false}>` so the two don't double up their own
 * sticky/background treatments. Every dashboard table/list toolbar should use
 * this component rather than a bespoke header — that's what keeps every page
 * on one shared layout system.
 */
export function StickyToolbar({ children, className }: StickyToolbarProps) {
  return (
    <div
      className={cn(
        "glass-card sticky top-0 z-20 space-y-3 rounded-2xl p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
