import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, MessageCircle } from "lucide-react";
import type { WhatsAppMessage } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function counterpartyPhone(message: WhatsAppMessage): string {
  return message.direction === "inbound" ? message.fromPhone : message.toPhone;
}

export async function RecentMessagesWidget({ messages }: { messages: WhatsAppMessage[] }) {
  const t = await getTranslations("dashboardHome.recentMessages");
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Link href="/dashboard/whatsapp-activity" className="text-xs text-primary hover:underline">
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessageCircle className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-accent"
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
