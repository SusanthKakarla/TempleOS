"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Globe, Link as LinkIcon } from "lucide-react";
import type { SocialPlatform, TempleSocialLink } from "@/types/db";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// lucide-react no longer ships trademarked brand/logo icons, so every
// platform uses the same generic link glyph and is distinguished by label.
const PLATFORMS: { value: SocialPlatform; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "facebook", icon: LinkIcon },
  { value: "instagram", icon: LinkIcon },
  { value: "youtube", icon: LinkIcon },
  { value: "twitter", icon: LinkIcon },
  { value: "website", icon: Globe },
  { value: "other", icon: LinkIcon },
];

function SocialLinkRow({
  platform,
  label,
  Icon,
  initialUrl,
  onSaved,
  t,
  saveLabel,
  savingLabel,
}: {
  platform: SocialPlatform;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  initialUrl: string;
  onSaved: () => void;
  t: ReturnType<typeof useTranslations>;
  saveLabel: string;
  savingLabel: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      if (url.trim()) {
        const response = await fetch(`/api/temple-social-links/${platform}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? t("linkSaveError", { platform: label }));
        }
      } else {
        const response = await fetch(`/api/temple-social-links/${platform}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? t("linkClearError", { platform: label }));
        }
      }
      toast.success(t("linkSaved", { platform: label }));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("linkSaveError", { platform: label }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <FloatingLabelInput
        id={`social-link-${platform}`}
        label={label}
        wrapperClassName="flex-1"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={submitting}>
        {submitting ? savingLabel : saveLabel}
      </Button>
    </div>
  );
}

export function SocialLinksForm({ socialLinks }: { socialLinks: TempleSocialLink[] }) {
  const router = useRouter();
  const tCommon = useTranslations("chatbotSettings.common");
  const tForm = useTranslations("chatbotSettings.socialLinksForm");
  const urlByPlatform = new Map(socialLinks.map((link) => [link.platform, link.url]));

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle>{tForm("cardTitle")}</CardTitle>
        <CardDescription>{tForm("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLATFORMS.map((platform) => (
          <SocialLinkRow
            key={platform.value}
            platform={platform.value}
            label={tForm(`platforms.${platform.value}`)}
            Icon={platform.icon}
            initialUrl={urlByPlatform.get(platform.value) ?? ""}
            onSaved={() => router.refresh()}
            t={tForm}
            saveLabel={tCommon("save")}
            savingLabel={tCommon("saving")}
          />
        ))}
      </CardContent>
    </Card>
  );
}
