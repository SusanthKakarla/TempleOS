"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Link as LinkIcon } from "lucide-react";
import type { SocialPlatform, TempleSocialLink } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// lucide-react no longer ships trademarked brand/logo icons, so every
// platform uses the same generic link glyph and is distinguished by label.
const PLATFORMS: { value: SocialPlatform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "facebook", label: "Facebook", icon: LinkIcon },
  { value: "instagram", label: "Instagram", icon: LinkIcon },
  { value: "youtube", label: "YouTube", icon: LinkIcon },
  { value: "twitter", label: "Twitter / X", icon: LinkIcon },
  { value: "website", label: "Website", icon: Globe },
  { value: "other", label: "Other", icon: LinkIcon },
];

function SocialLinkRow({
  platform,
  label,
  Icon,
  initialUrl,
  onSaved,
}: {
  platform: SocialPlatform;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  initialUrl: string;
  onSaved: () => void;
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
          throw new Error(body.error ?? `Failed to save ${label} link`);
        }
      } else {
        const response = await fetch(`/api/temple-social-links/${platform}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to clear ${label} link`);
        }
      }
      toast.success(`${label} link saved`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${label} link`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <Input
        placeholder={`https://${platform}.com/...`}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1"
      />
      <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={submitting}>
        {submitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

export function SocialLinksForm({ socialLinks }: { socialLinks: TempleSocialLink[] }) {
  const router = useRouter();
  const urlByPlatform = new Map(socialLinks.map((link) => [link.platform, link.url]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
        <CardDescription>Shown alongside contact details in the WhatsApp chatbot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLATFORMS.map((platform) => (
          <SocialLinkRow
            key={platform.value}
            platform={platform.value}
            label={platform.label}
            Icon={platform.icon}
            initialUrl={urlByPlatform.get(platform.value) ?? ""}
            onSaved={() => router.refresh()}
          />
        ))}
      </CardContent>
    </Card>
  );
}
