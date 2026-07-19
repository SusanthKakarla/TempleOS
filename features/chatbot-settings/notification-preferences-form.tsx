"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { Tenant } from "@/types/db";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ToggleRow {
  key: "notifyOnNewEvent" | "notifyOnEventUpdated" | "notifyOnEventCancelled";
  rowKey: "newEvent" | "eventUpdated" | "eventCancelled";
}

const ROWS: ToggleRow[] = [
  { key: "notifyOnNewEvent", rowKey: "newEvent" },
  { key: "notifyOnEventUpdated", rowKey: "eventUpdated" },
  { key: "notifyOnEventCancelled", rowKey: "eventCancelled" },
];

export function NotificationPreferencesForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const tForm = useTranslations("chatbotSettings.notificationPreferencesForm");
  const [values, setValues] = useState({
    notifyOnNewEvent: tenant.notifyOnNewEvent,
    notifyOnEventUpdated: tenant.notifyOnEventUpdated,
    notifyOnEventCancelled: tenant.notifyOnEventCancelled,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleToggle(key: ToggleRow["key"], checked: boolean) {
    const previous = values;
    setValues({ ...values, [key]: checked });
    setSubmitting(true);
    try {
      const response = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tForm("errorFallback"));
      }
      router.refresh();
    } catch (err) {
      setValues(previous);
      toast.error(err instanceof Error ? err.message : tForm("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4.5 text-saffron" />
          {tForm("cardTitle")}
        </CardTitle>
        <CardDescription>{tForm("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{tForm(`rows.${row.rowKey}.label`)}</p>
              <p className="text-xs text-muted-foreground">{tForm(`rows.${row.rowKey}.description`)}</p>
            </div>
            <Switch
              checked={values[row.key]}
              disabled={submitting}
              onCheckedChange={(checked) => handleToggle(row.key, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
