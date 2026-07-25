"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign, CampaignAudienceFilter, CampaignType, SupportedLanguage } from "@/types/db";
import { CAMPAIGN_TYPES } from "@/types/db";

type AudienceOptionType = "all" | "active" | "donors" | "opted_in" | "language";

interface CampaignFormDialogProps {
  mode: "create" | "edit";
  campaign?: Campaign;
  trigger: ReactElement;
  onSaved: () => void;
}

export function CampaignFormDialog({ mode, campaign, trigger, onSaved }: CampaignFormDialogProps) {
  const t = useTranslations("campaigns.form");
  const tTypes = useTranslations("campaigns.types");
  const tAudience = useTranslations("campaigns.audienceOptions");
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [campaignType, setCampaignType] = useState<CampaignType>(campaign?.campaignType ?? "one_time");
  const [customMessage, setCustomMessage] = useState(campaign?.customMessage ?? "");
  const [audienceType, setAudienceType] = useState<AudienceOptionType>(
    campaign && campaign.audienceFilter.type !== "family" && campaign.audienceFilter.type !== "event_attendees"
      ? campaign.audienceFilter.type
      : "all",
  );
  const [audienceLanguage, setAudienceLanguage] = useState<SupportedLanguage>(
    campaign?.audienceFilter.type === "language" ? campaign.audienceFilter.language : "en",
  );
  const [linkedDonationPurpose, setLinkedDonationPurpose] = useState(campaign?.linkedDonationPurpose ?? "");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const audienceFilter: CampaignAudienceFilter =
    audienceType === "language" ? { type: "language", language: audienceLanguage } : { type: audienceType };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Deferred a tick so the loading flag flips inside the timeout callback
    // rather than synchronously in the effect body.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setAudienceLoading(true);
      fetch("/api/campaigns/audience-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audienceFilter),
      })
        .then((res) => res.json())
        .then((body: { count: number | null }) => {
          if (!cancelled) setAudienceCount(body.count);
        })
        .finally(() => {
          if (!cancelled) setAudienceLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when the audience selection changes
  }, [open, audienceType, audienceLanguage]);

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError(t("titleLabel") + " is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        description: description || null,
        campaignType,
        channel: "whatsapp" as const,
        customMessage: customMessage || null,
        templateKey: null,
        audienceFilter,
        linkedDonationPurpose: linkedDonationPurpose || null,
        scheduleType: "one_time" as const,
      };
      const url = mode === "create" ? "/api/campaigns" : `/api/campaigns/${campaign?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? (mode === "create" ? t("createError") : t("updateError")));
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <LabeledInput
            id="campaign-title"
            label={t("titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="campaign-description">{t("descriptionLabel")}</Label>
            <Textarea
              id="campaign-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionLabel")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("typeLabel")}</Label>
            <Select value={campaignType} onValueChange={(v) => setCampaignType((v as CampaignType) ?? "one_time")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tTypes(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-message">{t("customMessageLabel")}</Label>
            <Textarea
              id="campaign-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={t("customMessageLabel")}
              className="min-h-24"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("audienceLabel")}</Label>
            <Select value={audienceType} onValueChange={(v) => setAudienceType((v as AudienceOptionType) ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["all", "active", "donors", "opted_in", "language"] as const).map((option) => (
                  <SelectItem key={option} value={option}>
                    {tAudience(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {audienceType === "language" && (
              <Select value={audienceLanguage} onValueChange={(v) => setAudienceLanguage((v as SupportedLanguage) ?? "en")}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="te">తెలుగు</SelectItem>
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              {audienceLoading
                ? t("audienceCountLoading")
                : audienceCount === null
                  ? t("audienceUnsupported")
                  : t("audienceCount", { count: audienceCount })}
            </p>
          </div>

          {campaignType === "donation" && (
            <LabeledInput
              id="campaign-donation-purpose"
              label={t("linkedDonationPurposeLabel")}
              value={linkedDonationPurpose}
              onChange={(e) => setLinkedDonationPurpose(e.target.value)}
            />
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
