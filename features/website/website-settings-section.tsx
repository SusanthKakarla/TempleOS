"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/features/media/media-upload";
import { HERO_TEMPLATES, SITE_THEMES } from "@/lib/site/site-theme";
import {
  WEBSITE_HERO_TEMPLATES,
  WEBSITE_THEMES,
  type NotificationMedia,
  type TenantWebsite,
  type WebsiteHeroTemplate,
  type WebsiteTheme,
} from "@/types/db";

interface Props {
  website: TenantWebsite | null;
  /** Already-uploaded images, so the pickers show what is currently in use. */
  media: {
    deity: NotificationMedia | null;
    hero: NotificationMedia | null;
    logo: NotificationMedia | null;
    og: NotificationMedia | null;
  };
  /** The temple's own public address, resolved server-side from its website domain row. */
  websiteUrl: string | null;
  /**
   * Where to save. Defaults to the tenant admin's own endpoint, which derives
   * the tenant from the session; Super Admin passes its per-temple route. The
   * component never sends a tenant id either way — which one is being edited
   * is decided entirely by the endpoint the server authorises.
   */
  endpoint?: string;
}

/**
 * The tenant admin's Public Website settings.
 *
 * Presentation only. Timings, events, sevas, gallery images and contact
 * details are deliberately absent: they are owned by their existing modules
 * and the public site reads them live, so duplicating them here would create
 * a second copy that could disagree with what the temple actually maintains.
 * The note in the UI says so, because otherwise an admin looks for them here.
 */
export function WebsiteSettingsSection({ website, media, websiteUrl, endpoint = "/api/website" }: Props) {
  const [enabled, setEnabled] = useState(website?.enabled ?? false);
  const [heroTemplate, setHeroTemplate] = useState<WebsiteHeroTemplate>(website?.heroTemplate ?? "classic");
  const [theme, setTheme] = useState<WebsiteTheme>(website?.theme ?? "saffron");
  const [displayName, setDisplayName] = useState(website?.displayName ?? "");
  const [deityName, setDeityName] = useState(website?.deityName ?? "");
  const [heroTitle, setHeroTitle] = useState(website?.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(website?.heroSubtitle ?? "");
  const [story, setStory] = useState(website?.story ?? "");
  const [aboutContent, setAboutContent] = useState(website?.aboutContent ?? "");
  const [seoTitle, setSeoTitle] = useState(website?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(website?.seoDescription ?? "");
  const [deity, setDeity] = useState(media.deity);
  const [hero, setHero] = useState(media.hero);
  const [logo, setLogo] = useState(media.logo);
  const [og, setOg] = useState(media.og);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // No tenant id: the server derives it from the session.
        body: JSON.stringify({
          enabled,
          heroTemplate,
          theme,
          displayName,
          deityName,
          heroTitle,
          heroSubtitle,
          story,
          aboutContent,
          seoTitle,
          seoDescription,
          deityMediaId: deity?.id ?? null,
          heroMediaId: hero?.id ?? null,
          logoMediaId: logo?.id ?? null,
          ogMediaId: og?.id ?? null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save the website settings.");
      toast.success("Website settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the website settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-medium">Public website</p>
          <p className="text-sm text-muted-foreground">
            {websiteUrl ? (
              <>
                Your temple&apos;s website address is <span className="font-medium">{websiteUrl}</span>.
              </>
            ) : (
              "This temple doesn't have a website address yet. Contact TempleOS support."
            )}
          </p>
        </div>

        {websiteUrl && (
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            render={<a href={websiteUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="size-4" />
            Preview website
          </Button>
        )}
      </div>

      <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <span>
          <span className="block text-sm font-medium">Website published</span>
          <span className="block text-xs text-muted-foreground">
            While this is off, visitors see a &quot;currently unavailable&quot; page instead of your temple&apos;s
            content.
          </span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="website-template">Hero template</Label>
          <Select value={heroTemplate} onValueChange={(value) => setHeroTemplate(value as WebsiteHeroTemplate)}>
            <SelectTrigger id="website-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEBSITE_HERO_TEMPLATES.map((key) => (
                <SelectItem key={key} value={key}>
                  {HERO_TEMPLATES[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website-theme">Colour theme</Label>
          <Select value={theme} onValueChange={(value) => setTheme(value as WebsiteTheme)}>
            <SelectTrigger id="website-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEBSITE_THEMES.map((key) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2 capitalize">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: SITE_THEMES[key].accent }}
                      aria-hidden="true"
                    />
                    {key}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledInput
          id="website-display-name"
          label="Website title"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Defaults to your temple's name"
        />
        <LabeledInput
          id="website-deity-name"
          label="Primary deity"
          value={deityName}
          onChange={(event) => setDeityName(event.target.value)}
        />
        <LabeledInput
          id="website-hero-title"
          label="Hero heading"
          value={heroTitle}
          onChange={(event) => setHeroTitle(event.target.value)}
          placeholder="Defaults to your temple's name"
        />
        <LabeledInput
          id="website-hero-subtitle"
          label="Hero subtitle"
          value={heroSubtitle}
          onChange={(event) => setHeroSubtitle(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MediaUpload
          category="temple_deity"
          value={deity}
          onChange={setDeity}
          label="Deity image"
          hint="Shown in the 3D hero frame. Your own photograph is used exactly as uploaded."
        />
        <MediaUpload
          category="temple_hero"
          value={hero}
          onChange={setHero}
          label="Hero background"
          hint="Falls back to the deity image when empty."
        />
        <MediaUpload category="temple_logo" value={logo} onChange={setLogo} label="Temple logo" />
        <MediaUpload
          category="temple_hero"
          value={og}
          onChange={setOg}
          label="Social preview image"
          hint="Used when the website is shared on WhatsApp or social media."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website-story">Temple story</Label>
        <Textarea id="website-story" rows={5} value={story} onChange={(event) => setStory(event.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website-about">About page content</Label>
        <Textarea
          id="website-about"
          rows={5}
          value={aboutContent}
          onChange={(event) => setAboutContent(event.target.value)}
          placeholder="Leave empty to use your temple description"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledInput
          id="website-seo-title"
          label="SEO title"
          value={seoTitle}
          onChange={(event) => setSeoTitle(event.target.value)}
        />
        <LabeledInput
          id="website-seo-description"
          label="SEO description"
          value={seoDescription}
          onChange={(event) => setSeoDescription(event.target.value)}
        />
      </div>

      <p className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
        Timings, events, sevas, gallery photos, contact details and social links are managed in their own sections and
        appear on your website automatically — there is nothing to copy here.
      </p>

      <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
        {saving && <Loader2 className="size-4 animate-spin" />}
        Save website settings
      </Button>
    </div>
  );
}
