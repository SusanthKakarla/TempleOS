"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, List, MousePointerClick, XCircle } from "lucide-react";
import type { SupportedLanguage, WhatsAppMessage } from "@/types/db";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/date";

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "queued") return <Clock className="size-3.5 text-muted-foreground" />;
  return <CheckCircle2 className="size-3.5 text-emerald" />;
}

const MESSAGE_TYPE_ICON: Partial<Record<WhatsAppMessage["messageType"], typeof List>> = {
  button: MousePointerClick,
  list: List,
};

export function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("whatsappActivity.messageBubble");
  const isOutbound = message.direction === "outbound";
  const TypeIcon = isOutbound ? MESSAGE_TYPE_ICON[message.messageType] : undefined;
  const typeLabel = message.messageType === "button" ? t("buttons") : message.messageType === "list" ? t("list") : null;

  return (
    <div className={cn("flex flex-col gap-1", isOutbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm sm:max-w-[70%]",
          isOutbound
            ? "rounded-tr-sm bg-emerald text-emerald-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
      <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        {TypeIcon && typeLabel && (
          <span className="flex items-center gap-0.5">
            <TypeIcon className="size-3" />
            {typeLabel}
          </span>
        )}
        {formatTime(message.createdAt, locale)}
        {isOutbound && <StatusIcon status={message.status} />}
      </span>
    </div>
  );
}
