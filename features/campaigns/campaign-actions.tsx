"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CampaignActionsProps {
  donationLink: string;
  /** Same URL carrying a short-lived admin-preview grant; opened instead of the bare link so an admin can always see their own campaign. Never copied or shared. */
  previewLink?: string | null;
  className?: string;
}

/**
 * "Open Campaign" (the real public page, in a new tab) + "Copy Link" — the
 * donation URL itself is never rendered as visible text, only used as the
 * `href` and the clipboard payload. Built from the same `buildDonationLink()`
 * output every WhatsApp broadcast already uses (computed server-side in the
 * page component, passed in as a plain string). Used on the Campaign Details
 * page only — the Create/Edit dialog still shows the full read-only URL via
 * `DonationLinkField`.
 *
 * Open and Copy intentionally carry different URLs: Open adds the preview
 * grant so an admin is never locked out of their own draft/ended campaign,
 * while Copy stays the clean public link that goes out to devotees.
 */
export function CampaignActions({ donationLink, previewLink, className }: CampaignActionsProps) {
  const t = useTranslations("campaigns.detail.campaignActions");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(donationLink);
      toast.success(t("copiedToast"));
    } catch {
      toast.error(t("copyErrorToast"));
    }
  }

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        render={<a href={previewLink || donationLink} target="_blank" rel="noopener noreferrer" />}
      >
        <ExternalLink className="size-4" />
        {t("openButton")}
      </Button>
      <Button type="button" variant="outline" className="gap-1.5" onClick={handleCopy}>
        <Copy className="size-4" />
        {t("copyButton")}
      </Button>
    </div>
  );
}
