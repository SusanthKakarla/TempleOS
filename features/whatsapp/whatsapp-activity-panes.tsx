"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Master-detail layout: both panes side by side on desktop, but only one at a
 * time on mobile (list by default, thread once a conversation is selected) —
 * the plain flex row this replaces had no mobile fallback at all, squeezing
 * both panes into phone-width viewports.
 */
export function WhatsAppActivityPanes({
  list,
  children,
}: {
  list: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasSelectedConversation = pathname !== "/dashboard/whatsapp-activity";

  return (
    <div className="flex h-[75vh] min-h-125 gap-4 overflow-hidden">
      <div
        className={cn(
          "glass-panel w-full max-w-xs shrink-0 overflow-hidden rounded-2xl lg:max-w-sm xl:max-w-md",
          hasSelectedConversation ? "hidden md:block" : "block",
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "glass-panel flex-1 overflow-hidden rounded-2xl",
          hasSelectedConversation ? "block" : "hidden md:block",
        )}
      >
        {children}
      </div>
    </div>
  );
}
