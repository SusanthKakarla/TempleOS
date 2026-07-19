"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Postgres TIME comes back as "HH:MM:SS"; <input type="time"> wants "HH:MM". */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export function TempleTimingsForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.timingsForm");
  const [morningOpen, setMorningOpen] = useState(toInputTime(tenant.morningOpen));
  const [morningClose, setMorningClose] = useState(toInputTime(tenant.morningClose));
  const [eveningOpen, setEveningOpen] = useState(toInputTime(tenant.eveningOpen));
  const [eveningClose, setEveningClose] = useState(toInputTime(tenant.eveningClose));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ morningOpen, morningClose, eveningOpen, eveningClose }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tForm("errorFallback"));
      }
      toast.success(tForm("successToast"));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : tForm("errorFallback");
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle>{tForm("cardTitle")}</CardTitle>
        <CardDescription>{tForm("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="temple-timings-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="morning-open">{tForm("fields.morningOpen")}</Label>
              <Input
                id="morning-open"
                type="time"
                value={morningOpen}
                onChange={(e) => setMorningOpen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morning-close">{tForm("fields.morningClose")}</Label>
              <Input
                id="morning-close"
                type="time"
                value={morningClose}
                onChange={(e) => setMorningClose(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evening-open">{tForm("fields.eveningOpen")}</Label>
              <Input
                id="evening-open"
                type="time"
                value={eveningOpen}
                onChange={(e) => setEveningOpen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evening-close">{tForm("fields.eveningClose")}</Label>
              <Input
                id="evening-close"
                type="time"
                value={eveningClose}
                onChange={(e) => setEveningClose(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="temple-timings-form" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
