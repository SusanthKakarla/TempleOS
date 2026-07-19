"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ConversationSummary } from "@/types/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function ConversationListItem({ conversation }: { conversation: ConversationSummary }) {
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/whatsapp-activity/${conversation.devoteeId}`;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/dashboard/whatsapp-activity/${conversation.devoteeId}`}
      className={cn(
        "flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/60",
        isActive && "bg-muted",
      )}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
          {getInitials(conversation.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm", hasUnread ? "font-semibold" : "font-medium")}>
            {conversation.displayName}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{conversation.whatsappPhone}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={cn("truncate text-xs", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {conversation.lastDirection === "outbound" ? "You: " : ""}
            {conversation.lastMessagePreview ?? "No messages yet"}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {conversation.preferredLanguage && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {conversation.preferredLanguage.toUpperCase()}
              </Badge>
            )}
            {hasUnread && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-saffron text-[10px] font-semibold text-white">
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
