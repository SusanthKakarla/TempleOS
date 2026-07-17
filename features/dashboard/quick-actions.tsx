"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/features/events/event-form-dialog";
import { DevoteeFormDialog } from "@/features/devotees/devotee-form-dialog";

export function QuickActions() {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <EventFormDialog
          mode="create"
          onSaved={refresh}
          trigger={
            <Button variant="outline" className="flex-1 justify-start gap-2">
              <CalendarPlus className="size-4 text-saffron" />
              Create event
            </Button>
          }
        />
        <DevoteeFormDialog
          mode="create"
          onSaved={refresh}
          trigger={
            <Button variant="outline" className="flex-1 justify-start gap-2">
              <UserPlus className="size-4 text-royal-blue" />
              Add devotee
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
