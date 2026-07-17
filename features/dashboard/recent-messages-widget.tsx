import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { WhatsAppMessage } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function counterpartyPhone(message: WhatsAppMessage): string {
  return message.direction === "inbound" ? message.fromPhone : message.toPhone;
}

export function RecentMessagesWidget({ messages }: { messages: WhatsAppMessage[] }) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Recent WhatsApp Messages</CardTitle>
        <Link href="/dashboard/whatsapp-activity" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No WhatsApp activity yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${
                  message.direction === "inbound" ? "gradient-green-emerald" : "gradient-blue-purple"
                }`}
              >
                {message.direction === "inbound" ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{counterpartyPhone(message)}</p>
                <p className="truncate text-xs text-muted-foreground">{message.body}</p>
              </div>
              <Badge variant={message.status === "failed" ? "destructive" : "secondary"} className="shrink-0">
                {message.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
