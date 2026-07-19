"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import type { ConversationSummary } from "@/types/db";
import { ExportMenu } from "@/features/export/export-menu";
import { ConversationSearchFilterBar } from "./conversation-search-filter-bar";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  const searchParams = useSearchParams();
  const t = useTranslations("whatsappActivity");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-3 pb-0">
        <p className="text-sm font-medium">{t("list.conversationCount", { count: conversations.length })}</p>
        <ExportMenu exportUrl="/api/whatsapp/conversations/export" filterParams={searchParams} moduleLabel="conversations" />
      </div>
      <ConversationSearchFilterBar />
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <div className="gradient-blue-purple flex size-12 items-center justify-center rounded-2xl shadow-sm">
              <MessageCircle className="size-5 text-white" />
            </div>
            <p className="text-sm font-medium">{t("emptyStates.noConversations.title")}</p>
            <p className="text-xs text-muted-foreground">{t("emptyStates.noConversations.description")}</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem key={conversation.devoteeId} conversation={conversation} />
          ))
        )}
      </div>
    </div>
  );
}
