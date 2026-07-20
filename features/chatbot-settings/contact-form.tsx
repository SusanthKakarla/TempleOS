"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Link as LinkIcon } from "lucide-react";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.contactForm");
  const [defaultContactPhone, setDefaultContactPhone] = useState(tenant.defaultContactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(tenant.contactEmail ?? "");
  const [address, setAddress] = useState(tenant.address ?? "");
  const [googleMapsLink, setGoogleMapsLink] = useState(tenant.googleMapsLink ?? "");
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
        body: JSON.stringify({ defaultContactPhone, contactEmail, address, googleMapsLink }),
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
        <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
          <FloatingLabelInput
            id="contact-phone"
            label={tForm("fields.phone")}
            icon={<Phone />}
            value={defaultContactPhone}
            onChange={(e) => setDefaultContactPhone(e.target.value)}
          />
          <FloatingLabelInput
            id="contact-email"
            label={tForm("fields.email")}
            icon={<Mail />}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <FloatingLabelInput
            id="contact-address"
            label={tForm("fields.address")}
            icon={<MapPin />}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <FloatingLabelInput
            id="contact-maps"
            label={tForm("fields.mapsLink")}
            icon={<LinkIcon />}
            value={googleMapsLink}
            onChange={(e) => setGoogleMapsLink(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="contact-form" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
