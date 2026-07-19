import { CheckCircle2, Clock, List, MousePointerClick, XCircle } from "lucide-react";
import type { WhatsAppMessage } from "@/types/db";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "queued") return <Clock className="size-3.5 text-muted-foreground" />;
  return <CheckCircle2 className="size-3.5 text-emerald" />;
}

const MESSAGE_TYPE_LABEL: Partial<Record<WhatsAppMessage["messageType"], { label: string; icon: typeof List }>> = {
  button: { label: "Buttons", icon: MousePointerClick },
  list: { label: "List", icon: List },
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const isOutbound = message.direction === "outbound";
  const typeTag = isOutbound ? MESSAGE_TYPE_LABEL[message.messageType] : undefined;

  return (
    <div className={cn("flex flex-col gap-1", isOutbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm sm:max-w-[70%]",
          isOutbound ? "rounded-tr-sm bg-emerald text-emerald-foreground" : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
      <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        {typeTag && (
          <span className="flex items-center gap-0.5">
            <typeTag.icon className="size-3" />
            {typeTag.label}
          </span>
        )}
        {formatTimestamp(message.createdAt)}
        {isOutbound && <StatusIcon status={message.status} />}
      </span>
    </div>
  );
}
