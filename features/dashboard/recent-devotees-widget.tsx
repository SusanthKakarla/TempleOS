import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import type { Devotee } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export async function RecentDevoteesWidget({ devotees }: { devotees: Devotee[] }) {
  const t = await getTranslations("dashboardHome.recentDevotees");
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Link href="/dashboard/devotees" className="text-xs text-primary hover:underline">
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {devotees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          devotees.map((devotee) => (
            <div
              key={devotee.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-accent"
            >
              <Avatar className="size-9">
                <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                  {getInitials(devotee.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{devotee.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{devotee.whatsappPhone}</p>
              </div>
              <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"} className="shrink-0">
                {devotee.whatsappOptInStatus ? t("optedIn") : t("notOptedIn")}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
