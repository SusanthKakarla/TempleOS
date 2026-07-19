import { cn } from "@/lib/utils";

/** Glass-card wrapper for table surfaces. Replaces the plain `rounded-xl border bg-background` convention. */
export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-card overflow-hidden rounded-2xl p-0", className)}>{children}</div>;
}
