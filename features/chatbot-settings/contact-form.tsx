"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Link as LinkIcon } from "lucide-react";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
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
        throw new Error(body.error ?? "Failed to save contact details");
      }
      toast.success("Contact details saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save contact details";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temple Contact Details</CardTitle>
        <CardDescription>Shared with devotees who ask for contact info on WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-phone"
                placeholder="+91XXXXXXXXXX"
                value={defaultContactPhone}
                onChange={(e) => setDefaultContactPhone(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-email"
                type="email"
                placeholder="office@temple.org"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-address">Address</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-maps">Google Maps link</Label>
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-maps"
                placeholder="https://maps.app.goo.gl/..."
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
