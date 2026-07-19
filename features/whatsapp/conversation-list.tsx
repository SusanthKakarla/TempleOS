"use client";

import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { ConversationSummary } from "@/types/db";
import { ExportMenu } from "@/features/export/export-menu";
import { ConversationSearchFilterBar } from "./conversation-search-filter-bar";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-3 pb-0">
        <p className="text-sm font-medium">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p>
        <ExportMenu exportUrl="/api/whatsapp/conversations/export" filterParams={searchParams} moduleLabel="conversations" />
      </div>
      <ConversationSearchFilterBar />
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs text-muted-foreground">
              Conversations appear here once devotees message the temple WhatsApp number.
            </p>
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
