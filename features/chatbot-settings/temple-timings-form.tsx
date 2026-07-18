"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Tenant } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Postgres TIME comes back as "HH:MM:SS"; <input type="time"> wants "HH:MM". */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export function TempleTimingsForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [morningOpen, setMorningOpen] = useState(toInputTime(tenant.morningOpen));
  const [morningClose, setMorningClose] = useState(toInputTime(tenant.morningClose));
  const [eveningOpen, setEveningOpen] = useState(toInputTime(tenant.eveningOpen));
  const [eveningClose, setEveningClose] = useState(toInputTime(tenant.eveningClose));
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
        body: JSON.stringify({ morningOpen, morningClose, eveningOpen, eveningClose }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save timings");
      }
      toast.success("Temple timings saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save timings";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regular Temple Timings</CardTitle>
        <CardDescription>
          Used by the WhatsApp chatbot when there&apos;s no special-day override for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="morning-open">Morning open</Label>
              <Input
                id="morning-open"
                type="time"
                value={morningOpen}
                onChange={(e) => setMorningOpen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morning-close">Morning close</Label>
              <Input
                id="morning-close"
                type="time"
                value={morningClose}
                onChange={(e) => setMorningClose(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evening-open">Evening open</Label>
              <Input
                id="evening-open"
                type="time"
                value={eveningOpen}
                onChange={(e) => setEveningOpen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evening-close">Evening close</Label>
              <Input
                id="evening-close"
                type="time"
                value={eveningClose}
                onChange={(e) => setEveningClose(e.target.value)}
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
