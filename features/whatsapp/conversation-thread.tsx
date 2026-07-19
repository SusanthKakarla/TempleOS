"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SupportedLanguage, WhatsAppMessage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { formatDate, isToday, isYesterday } from "@/lib/date";
import { groupMessagesByDay } from "./group-messages-by-day";
import { MessageBubble } from "./message-bubble";

const PAGE_SIZE = 50;

function describeDay(iso: string, locale: SupportedLanguage, todayLabel: string, yesterdayLabel: string): string {
  const date = new Date(iso);
  if (isToday(date)) return todayLabel;
  if (isYesterday(date)) return yesterdayLabel;
  return formatDate(date, locale, "d MMMM yyyy");
}

export function ConversationThread({
  devoteeId,
  initialMessages,
}: {
  devoteeId: string;
  initialMessages: WhatsAppMessage[];
}) {
  // initialMessages arrive newest-first from the DB (matches every other
  // list* function's convention) — reverse once for oldest-first display.
  const [messages, setMessages] = useState<WhatsAppMessage[]>(() => [...initialMessages].reverse());
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE_SIZE);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("whatsappActivity.thread");

  useEffect(() => {
    if (!didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      didInitialScroll.current = true;
    }
  }, []);

  async function loadOlder() {
    if (messages.length === 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const response = await fetch(
        `/api/whatsapp/conversations/${devoteeId}/messages?before=${encodeURIComponent(oldest.createdAt)}&limit=${PAGE_SIZE}`,
      );
      const body = (await response.json().catch(() => ({ messages: [] }))) as { messages: WhatsAppMessage[] };
      setHasMore(body.messages.length >= PAGE_SIZE);
      setMessages((prev) => [...[...body.messages].reverse(), ...prev]);
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = groupMessagesByDay(messages);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {hasMore && (
        <div className="mb-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadOlder} disabled={loadingMore}>
            {loadingMore ? t("loadingMessages") : t("loadOlderMessages")}
          </Button>
        </div>
      )}
      <div className="flex flex-1 flex-col justify-end gap-3">
        {grouped.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{t("noMessagesYet")}</p>
        ) : (
          grouped.map(({ message, showSeparator }) => (
            <div key={message.id} className="flex flex-col gap-3">
              {showSeparator && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {describeDay(message.createdAt, locale, t("today"), t("yesterday"))}
                  </span>
                </div>
              )}
              <MessageBubble message={message} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
