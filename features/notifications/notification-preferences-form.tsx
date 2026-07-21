"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { NotificationType } from "@/types/db";

interface PreferenceRow {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
}

export function NotificationPreferencesForm({ preferences }: { preferences: PreferenceRow[] }) {
  const t = useTranslations("notificationPreferences");
  const [rows, setRows] = useState(preferences);
  const [savingType, setSavingType] = useState<NotificationType | null>(null);

  async function handleToggle(notificationType: NotificationType, field: "inAppEnabled" | "whatsappEnabled", value: boolean) {
    const next = rows.map((row) => (row.notificationType === notificationType ? { ...row, [field]: value } : row));
    setRows(next);
    setSavingType(notificationType);

    const target = next.find((row) => row.notificationType === notificationType);
    if (!target) return;

    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error(t("saveError"));
      setRows(rows); // revert
    } finally {
      setSavingType(null);
    }
  }

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.notificationType} className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0">
            <p className="text-sm font-medium">{t(`types.${row.notificationType}`)}</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`${row.notificationType}-in-app`}
                  checked={row.inAppEnabled}
                  disabled={savingType === row.notificationType}
                  onCheckedChange={(checked) => handleToggle(row.notificationType, "inAppEnabled", checked)}
                />
                <Label htmlFor={`${row.notificationType}-in-app`} className="text-sm text-muted-foreground">
                  {t("channels.inApp")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`${row.notificationType}-whatsapp`}
                  checked={row.whatsappEnabled}
                  disabled={savingType === row.notificationType}
                  onCheckedChange={(checked) => handleToggle(row.notificationType, "whatsappEnabled", checked)}
                />
                <Label htmlFor={`${row.notificationType}-whatsapp`} className="text-sm text-muted-foreground">
                  {t("channels.whatsapp")}
                </Label>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
