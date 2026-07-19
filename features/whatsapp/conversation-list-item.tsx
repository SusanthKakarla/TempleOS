"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ConversationSummary, SupportedLanguage } from "@/types/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate, formatTime, isToday, isYesterday } from "@/lib/date";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatRelativeTime(
  iso: string | null,
  locale: SupportedLanguage,
  yesterdayLabel: string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isToday(date)) return formatTime(date, locale);
  if (isYesterday(date)) return yesterdayLabel;
  return formatDate(date, locale);
}

export function ConversationListItem({ conversation }: { conversation: ConversationSummary }) {
  const pathname = usePathname();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("whatsappActivity.listItem");
  const isActive = pathname === `/dashboard/whatsapp-activity/${conversation.devoteeId}`;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/dashboard/whatsapp-activity/${conversation.devoteeId}`}
      className={cn(
        "relative flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/60",
        isActive && "bg-muted after:absolute after:inset-y-1.5 after:left-0 after:w-1 after:rounded-full after:bg-saffron",
      )}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white shadow-sm">
          {getInitials(conversation.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm", hasUnread ? "font-semibold" : "font-medium")}>
            {conversation.displayName}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt, locale, t("yesterday"))}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{conversation.whatsappPhone}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={cn("truncate text-xs", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {conversation.lastDirection === "outbound" ? t("youPrefix") : ""}
            {conversation.lastMessagePreview ?? t("noMessagesYet")}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {conversation.preferredLanguage && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {conversation.preferredLanguage.toUpperCase()}
              </Badge>
            )}
            {hasUnread && (
              <span className="gradient-saffron-gold flex size-4.5 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm">
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
