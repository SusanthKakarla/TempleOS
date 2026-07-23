import type { ReactNode } from "react";

/** Rounded, divided container for a column of `MobileListRow`s. */
export function MobileListView({ children }: { children: ReactNode }) {
  return <div className="divide-y overflow-hidden rounded-2xl border">{children}</div>;
}
