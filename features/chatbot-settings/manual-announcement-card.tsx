"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_LENGTH = 1000;

/** One-off admin-typed WhatsApp broadcast to every opted-in devotee — see lib/db/manual-broadcasts.ts. */
export function ManualAnnouncementCard() {
  const t = useTranslations("chatbotSettings.manualAnnouncementForm");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (!window.confirm(t("confirm"))) return;

    setSending(true);
    try {
      const response = await fetch("/api/chatbot-settings/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as { sentTo?: number; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("errorFallback"));
      }
      toast.success(t("sentTo", { count: body.sentTo ?? 0 }));
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <div>
        <p className="text-sm font-medium">{t("cardTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("cardDescription")}</p>
      </div>
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))}
        placeholder={t("placeholder")}
        rows={4}
        disabled={sending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {message.length}/{MAX_LENGTH}
        </span>
        <Button type="button" size="sm" onClick={handleSend} disabled={sending || !message.trim()}>
          <Send className="size-3.5" />
          {sending ? t("sending") : t("sendButton")}
        </Button>
      </div>
    </div>
  );
}
