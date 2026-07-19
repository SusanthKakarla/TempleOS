"use client";

import { useEffect, useRef, useState } from "react";
import type { WhatsAppMessage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";

const PAGE_SIZE = 50;

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

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {hasMore && (
        <div className="mb-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadOlder} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load older messages"}
          </Button>
        </div>
      )}
      <div className="flex flex-1 flex-col justify-end gap-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
