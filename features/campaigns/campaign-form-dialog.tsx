"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { MediaUpload } from "@/features/media/media-upload";
import { DateTimeField } from "@/features/events/date-time-field";
import { cn } from "@/lib/utils";
import { RECURRENCE_RULES, type RecurrenceRule } from "@/lib/campaigns/recurrence";
import type { Campaign, CampaignAudienceFilter, NotificationMedia, SupportedLanguage } from "@/types/db";
import { DonationLinkField } from "./donation-link-field";

/** TempleOS only ever runs donation campaigns today (confirmed before this simplification) — the campaign-type selector was removed from the UI, not the data model. Every campaign is still created with this literal value. */
const CAMPAIGN_TYPE = "donation" as const;

type AudienceOptionType = "all" | "active" | "donors" | "opted_in" | "language";
type ScheduleChoice = "now" | "later" | "recurring";

/** Plain YYYY-MM-DD calendar date, no time-of-day — distinct from DateTimeField, which is for the full send-time timestamp. */
function DateOnlyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker id={id} size="xl" value={value ?? ""} onChange={(next) => onChange(next || null)} />
    </div>
  );
}

interface CampaignFormDialogProps {
  mode: "create" | "edit";
  campaign?: Campaign;
  /** Edit mode only — null until the campaign is both saved and linked to a donation purpose. Hidden entirely in create mode (no slug/token exists to link to yet). */
  donationLink?: string | null;
  trigger: ReactElement;
  onSaved: () => void;
}

export function CampaignFormDialog({ mode, campaign, donationLink, trigger, onSaved }: CampaignFormDialogProps) {
  const t = useTranslations("campaigns.form");
  const tAudience = useTranslations("campaigns.audienceOptions");
  const tRecurrence = useTranslations("campaigns.form.recurrenceOptions");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
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
  const [banner, setBanner] = useState<NotificationMedia | null>(null);
  const [goalAmount, setGoalAmount] = useState(campaign?.goalAmount ?? "");
  const [campaignStartDate, setCampaignStartDate] = useState<string | null>(campaign?.campaignStartDate ?? null);
  const [campaignEndDate, setCampaignEndDate] = useState<string | null>(campaign?.campaignEndDate ?? null);
  const [scheduleChoice, setScheduleChoice] = useState<ScheduleChoice>(
    campaign?.scheduleType === "recurring" ? "recurring" : campaign?.scheduledAt ? "later" : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(campaign?.scheduledAt?.slice(0, 16) ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(
    (campaign?.recurrenceRule as RecurrenceRule | null) ?? "weekly",
  );
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<false | "draft" | "send">(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const audienceFilter: CampaignAudienceFilter =
    audienceType === "language" ? { type: "language", language: audienceLanguage } : { type: audienceType };

  /** Mirrors the same status gate campaign-detail.tsx's standalone "Send now" button already uses — don't offer a re-send action here on a campaign that's already running/completed/archived/cancelled. */
  const canSendNow =
    mode === "create" ||
    campaign?.status === "draft" ||
    campaign?.status === "scheduled" ||
    campaign?.status === "paused";

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

  async function handleSubmit(andSend: boolean) {
    setError(null);
    if (!title.trim()) {
      setError(t("titleLabel") + " is required");
      return;
    }
    setSubmitting(andSend ? "send" : "draft");
    try {
      const payload = {
        title,
        description: description || null,
        campaignType: CAMPAIGN_TYPE,
        channel: "whatsapp" as const,
        customMessage: customMessage || null,
        templateKey: null,
        audienceFilter,
        bannerMediaId: banner?.id ?? campaign?.bannerMediaId ?? null,
        linkedDonationPurpose: linkedDonationPurpose || null,
        goalAmount: goalAmount || null,
        campaignStartDate,
        campaignEndDate,
        scheduleType: scheduleChoice === "recurring" ? ("recurring" as const) : ("one_time" as const),
        scheduledAt: scheduleChoice === "later" && scheduledAt ? scheduledAt : null,
        recurrenceRule: scheduleChoice === "recurring" ? recurrenceRule : null,
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

      if (andSend) {
        const savedId = mode === "create" ? ((await response.json()) as { campaign: Campaign }).campaign.id : campaign!.id;
        const sendResponse = await fetch(`/api/campaigns/${savedId}/send`, { method: "POST" });
        if (!sendResponse.ok) {
          const body = (await sendResponse.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? t("sendError"));
        }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-175">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {donationLink && (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <DonationLinkField donationLink={donationLink} />
            </div>
          )}

          <LabeledInput
            id="campaign-title"
            label={t("titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputSize="lg"
            required
            requiredLabel={tCommon("required")}
          />

          <MediaUpload
            category="campaign_banner"
            title={title || undefined}
            value={banner}
            onChange={setBanner}
            label={t("bannerLabel")}
            hint={t("bannerHint")}
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

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="space-y-1.5">
              <LabeledInput
                id="campaign-donation-purpose"
                label={t("linkedDonationPurposeLabel")}
                value={linkedDonationPurpose}
                onChange={(e) => setLinkedDonationPurpose(e.target.value)}
                inputSize="lg"
              />
              <p className="text-xs text-muted-foreground">{t("linkedDonationPurposeHint")}</p>
            </div>
            <LabeledInput
              id="campaign-goal-amount"
              label={t("goalAmountLabel")}
              type="number"
              min="0"
              step="1"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              inputSize="lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <DateOnlyField id="campaign-start-date" label={t("startDateLabel")} value={campaignStartDate} onChange={setCampaignStartDate} />
              <DateOnlyField id="campaign-end-date" label={t("endDateLabel")} value={campaignEndDate} onChange={setCampaignEndDate} />
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
              {t("advancedOptions")}
              <ChevronDown className={cn("size-4 transition-transform", advancedOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
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
                  <SelectTrigger size="lg" className="w-full">
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
                    <SelectTrigger size="lg" className="mt-2 w-full">
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

              <div className="space-y-1.5">
                <Label>{t("scheduleTypeLabel")}</Label>
                <Select value={scheduleChoice} onValueChange={(v) => setScheduleChoice((v as ScheduleChoice) ?? "now")}>
                  <SelectTrigger size="lg" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">{t("scheduleTypeNow")}</SelectItem>
                    <SelectItem value="later">{t("scheduleTypeLater")}</SelectItem>
                    <SelectItem value="recurring">{t("scheduleTypeRecurring")}</SelectItem>
                  </SelectContent>
                </Select>
                {scheduleChoice === "later" && (
                  <div className="mt-2">
                    <DateTimeField id="campaign-scheduled-at" label={t("scheduledAtLabel")} value={scheduledAt} onChange={setScheduledAt} />
                  </div>
                )}
                {scheduleChoice === "recurring" && (
                  <Select value={recurrenceRule} onValueChange={(v) => setRecurrenceRule((v as RecurrenceRule) ?? "weekly")}>
                    <SelectTrigger size="lg" className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_RULES.map((rule) => (
                        <SelectItem key={rule} value={rule}>
                          {tRecurrence(rule)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className={cn("gap-2", canSendNow ? "grid grid-cols-2" : "")}>
          <Button
            variant={canSendNow ? "outline" : "default"}
            size="xl"
            onClick={() => handleSubmit(false)}
            disabled={submitting !== false}
          >
            {submitting === "draft" ? t("saving") : t("save")}
          </Button>
          {canSendNow && (
            <Button size="xl" onClick={() => handleSubmit(true)} disabled={submitting !== false}>
              {submitting === "send" ? t("sending") : t("sendNow")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
