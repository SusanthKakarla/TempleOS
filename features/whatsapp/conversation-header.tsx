import Link from "next/link";
import { HandCoins } from "lucide-react";
import type { ConversationSummary } from "@/types/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ConversationHeader({ conversation }: { conversation: ConversationSummary }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
            {getInitials(conversation.displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{conversation.displayName}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{conversation.whatsappPhone}</span>
            {conversation.preferredLanguage && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {conversation.preferredLanguage.toUpperCase()}
              </Badge>
            )}
            <Badge
              variant={conversation.whatsappOptInStatus ? "default" : "secondary"}
              className="px-1.5 py-0 text-[10px]"
            >
              {conversation.whatsappOptInStatus ? "Opted in" : "Not opted in"}
            </Badge>
            {conversation.isDonor && (
              <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
                <HandCoins className="size-2.5" />
                Donor
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/devotees/${conversation.devoteeId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View Profile
        </Link>
        <Link href="/dashboard/events" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Events
        </Link>
        <Link
          href={`/api/whatsapp/conversations/${conversation.devoteeId}/export?format=pdf`}
          prefetch={false}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Export
        </Link>
      </div>
    </div>
  );
}
