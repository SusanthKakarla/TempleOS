"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TempleInfoForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.templeInfoForm");
  const [name, setName] = useState(tenant.name);
  const [welcomeMessage, setWelcomeMessage] = useState(tenant.welcomeMessage ?? "");
  const [description, setDescription] = useState(tenant.description ?? "");
  const [history, setHistory] = useState(tenant.history ?? "");
  const [donationInfo, setDonationInfo] = useState(tenant.donationInfo ?? "");
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
        body: JSON.stringify({ name, welcomeMessage, description, history, donationInfo }),
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
        <form id="temple-info-form" onSubmit={handleSubmit} className="space-y-4">
          <LabeledInput
            id="temple-name"
            label={tForm("fields.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="welcome-message">{tForm("fields.welcomeMessage")}</Label>
            <Textarea
              id="welcome-message"
              placeholder={tForm("fields.welcomeMessagePlaceholder")}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{tForm("fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="history">{tForm("fields.history")}</Label>
            <Textarea id="history" value={history} onChange={(e) => setHistory(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donation-info">{tForm("fields.donationInfo")}</Label>
            <Textarea
              id="donation-info"
              placeholder={tForm("fields.donationInfoPlaceholder")}
              value={donationInfo}
              onChange={(e) => setDonationInfo(e.target.value)}
              rows={4}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="temple-info-form" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
