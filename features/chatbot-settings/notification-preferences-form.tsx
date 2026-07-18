"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { Tenant } from "@/types/db";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ToggleRow {
  key: "notifyOnNewEvent" | "notifyOnEventUpdated" | "notifyOnEventCancelled";
  label: string;
  description: string;
}

const ROWS: ToggleRow[] = [
  {
    key: "notifyOnNewEvent",
    label: "New event published",
    description: "Notify opted-in devotees automatically when an event is published.",
  },
  {
    key: "notifyOnEventUpdated",
    label: "Event details updated",
    description: "Notify devotees when a published event's date, time, location, title, or description changes.",
  },
  {
    key: "notifyOnEventCancelled",
    label: "Event cancelled",
    description: "Notify devotees automatically when an event is cancelled.",
  },
];

export function NotificationPreferencesForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
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
        throw new Error(body.error ?? "Failed to save notification preferences");
      }
      router.refresh();
    } catch (err) {
      setValues(previous);
      toast.error(err instanceof Error ? err.message : "Failed to save notification preferences");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4.5 text-saffron" />
          Event Notification Preferences
        </CardTitle>
        <CardDescription>
          Automatically message opted-in devotees on WhatsApp when events change. Devotees can opt out
          individually from their profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
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
