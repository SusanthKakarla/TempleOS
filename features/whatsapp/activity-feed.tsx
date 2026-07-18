"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, MessageCircle, Search, XCircle } from "lucide-react";
import type { MessageStatus, WhatsAppMessage } from "@/types/db";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function counterpartyPhone(message: WhatsAppMessage): string {
  return message.direction === "inbound" ? message.fromPhone : message.toPhone;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "queued") return <Clock className="size-3.5 text-muted-foreground" />;
  return <CheckCircle2 className="size-3.5 text-emerald" />;
}

type DirectionFilter = "all" | "inbound" | "outbound";

export function ActivityFeed({ messages }: { messages: WhatsAppMessage[] }) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");

  const filtered = useMemo(() => {
    return messages.filter((message) => {
      if (direction !== "all" && message.direction !== direction) return false;
      if (query.trim() && !counterpartyPhone(message).includes(query.trim())) return false;
      return true;
    });
  }, [messages, query, direction]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={direction} onValueChange={(v) => setDirection(v as DirectionFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No WhatsApp activity</p>
          <p className="text-sm text-muted-foreground">
            Messages will show up here once devotees message the temple number.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border bg-background p-4">
          {filtered.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.direction === "outbound" ? "items-end" : "items-start",
              )}
            >
              <span className="px-1 text-xs text-muted-foreground">
                {counterpartyPhone(message)} &middot; {formatTimestamp(message.createdAt)}
              </span>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[65%]",
                  message.direction === "outbound"
                    ? "rounded-tr-sm bg-emerald text-emerald-foreground"
                    : "rounded-tl-sm bg-muted text-foreground",
                )}
              >
                {message.body}
              </div>
              <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
                <StatusIcon status={message.status} />
                {message.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
