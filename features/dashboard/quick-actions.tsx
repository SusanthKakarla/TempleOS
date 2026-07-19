"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/features/events/event-form-dialog";
import { DevoteeFormDialog } from "@/features/devotees/devotee-form-dialog";

export function QuickActions() {
  const router = useRouter();
  const t = useTranslations("dashboardHome.quickActions");

  function refresh() {
    router.refresh();
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <EventFormDialog
          mode="create"
          onSaved={refresh}
          trigger={
            <Button variant="outline" className="group/action flex-1 justify-start gap-2.5">
              <span className="gradient-saffron-gold flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform duration-200 group-hover/action:scale-110">
                <CalendarPlus className="size-3.5" />
              </span>
              {t("createEvent")}
            </Button>
          }
        />
        <DevoteeFormDialog
          mode="create"
          onSaved={refresh}
          trigger={
            <Button variant="outline" className="group/action flex-1 justify-start gap-2.5">
              <span className="bg-royal-blue flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform duration-200 group-hover/action:scale-110">
                <UserPlus className="size-3.5" />
              </span>
              {t("addDevotee")}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
