"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// `icon` is a pre-rendered ReactNode (built in the server-component page), not a
// component reference — component types aren't serializable across the
// server/client boundary, but already-created elements are.
export type LegalTocEntry = {
  id: string;
  title: string;
  icon: React.ReactNode;
};

export function TableOfContents({ entries }: { entries: LegalTocEntry[] }) {
  const [activeId, setActiveId] = useState(entries[0]?.id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (observedEntries) => {
        const visible = observedEntries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    for (const el of elements) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [entries]);

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="mb-3 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px flex items-center gap-2 border-l-2 px-3 py-1.5 transition-colors",
                  isActive
                    ? "border-l-primary font-medium text-primary"
                    : "border-l-transparent text-muted-foreground hover:border-l-foreground/20 hover:text-foreground"
                )}
              >
                {entry.icon}
                <span className="truncate">{entry.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
