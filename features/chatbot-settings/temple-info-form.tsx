"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TempleInfoForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
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
        throw new Error(body.error ?? "Failed to save temple info");
      }
      toast.success("Temple info saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save temple info";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temple Info</CardTitle>
        <CardDescription>
          Shown to devotees in the WhatsApp chatbot&apos;s menu and replies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temple-name">Temple name</Label>
            <Input id="temple-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome-message">Welcome message</Label>
            <Textarea
              id="welcome-message"
              placeholder="Namaste! Welcome to our temple."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="history">History</Label>
            <Textarea id="history" value={history} onChange={(e) => setHistory(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donation-info">Donation info</Label>
            <Textarea
              id="donation-info"
              placeholder="How devotees can contribute (bank details, UPI ID, in-person, etc.)"
              value={donationInfo}
              onChange={(e) => setDonationInfo(e.target.value)}
              rows={4}
            />
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
