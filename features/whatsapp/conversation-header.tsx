import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HandCoins } from "lucide-react";
import type { ConversationSummary } from "@/types/db";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RECENTLY_ACTIVE_WINDOW_MS = 10 * 60 * 1000;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function isRecentlyActive(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  return Date.now() - new Date(lastMessageAt).getTime() < RECENTLY_ACTIVE_WINDOW_MS;
}

export async function ConversationHeader({ conversation }: { conversation: ConversationSummary }) {
  const t = await getTranslations("whatsappActivity.header");
  const recentlyActive = isRecentlyActive(conversation.lastMessageAt);

  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b p-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white shadow-sm">
            {getInitials(conversation.displayName)}
          </AvatarFallback>
          {recentlyActive && (
            <AvatarBadge className="bg-emerald" aria-label="Recently active" title="Recently active" />
          )}
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{conversation.displayName}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{conversation.whatsappPhone}</span>
            {conversation.preferredLanguage && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {conversation.preferredLanguage.toUpperCase()}
              </Badge>
            )}
            <Badge
              variant={conversation.whatsappOptInStatus ? "default" : "secondary"}
              className="px-1.5 py-0 text-[10px]"
            >
              {conversation.whatsappOptInStatus ? t("optedIn") : t("notOptedIn")}
            </Badge>
            {conversation.isDonor && (
              <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
                <HandCoins className="size-2.5" />
                {t("donor")}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/devotees/${conversation.devoteeId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("viewProfile")}
        </Link>
        <Link href="/dashboard/events" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {t("events")}
        </Link>
        <Link
          href={`/api/whatsapp/conversations/${conversation.devoteeId}/export?format=pdf`}
          prefetch={false}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("export")}
        </Link>
      </div>
    </div>
  );
}
