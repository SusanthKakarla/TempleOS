"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DonationLinkFieldProps {
  donationLink: string;
  className?: string;
}

/**
 * Read-only donation URL + "Open Campaign" (the real public page, in a new
 * tab — no separate admin preview) + "Copy Link". Built from the same
 * `buildDonationLink()` output every WhatsApp broadcast already uses
 * (computed server-side in the page component, passed in as a plain
 * string) — never re-derives or fabricates a URL. Used on the Campaign
 * Details page and the Create/Edit dialog (edit mode only, once a
 * donation purpose is linked).
 */
export function DonationLinkField({ donationLink, className }: DonationLinkFieldProps) {
  const t = useTranslations("campaigns.detail.donationLink");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(donationLink);
      toast.success(t("copiedToast"));
    } catch {
      toast.error(t("copyErrorToast"));
    }
  }

  return (
    <div className={className}>
      <Label>{t("title")}</Label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={donationLink}
          readOnly
          className="min-w-0 flex-1 text-sm"
          onFocus={(event) => event.target.select()}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            render={<a href={donationLink} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="size-3.5" />
            {t("openButton")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 sm:flex-none" onClick={handleCopy}>
            <Copy className="size-3.5" />
            {t("copyButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
