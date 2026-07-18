"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Bell, Cake, Phone, Sparkles, User, Users } from "lucide-react";
import type { Devotee } from "@/types/db";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DevoteeFormDialogProps {
  mode: "create" | "edit";
  devotee?: Devotee;
  trigger: ReactElement;
  onSaved: () => void;
}

export function DevoteeFormDialog({ mode, devotee, trigger, onSaved }: DevoteeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(devotee?.whatsappPhone ?? "");
  const [displayName, setDisplayName] = useState(devotee?.displayName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(devotee?.dateOfBirth ?? "");
  const [birthStar, setBirthStar] = useState(devotee?.birthStar ?? "");
  const [ancestralLineage, setAncestralLineage] = useState(devotee?.ancestralLineage ?? "");
  const [eventNotificationsEnabled, setEventNotificationsEnabled] = useState(
    devotee?.eventNotificationsEnabled ?? true,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToDevotee() {
    setWhatsappPhone(devotee?.whatsappPhone ?? "");
    setDisplayName(devotee?.displayName ?? "");
    setDateOfBirth(devotee?.dateOfBirth ?? "");
    setBirthStar(devotee?.birthStar ?? "");
    setAncestralLineage(devotee?.ancestralLineage ?? "");
    setEventNotificationsEnabled(devotee?.eventNotificationsEnabled ?? true);
    setError(null);
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/devotees" : `/api/devotees/${devotee!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappPhone,
          displayName,
          dateOfBirth,
          birthStar,
          ancestralLineage,
          ...(mode === "edit" ? { eventNotificationsEnabled } : {}),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save devotee");
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save devotee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToDevotee();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add devotee" : "Edit devotee"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Manually add a devotee. They'll be marked not opted in for WhatsApp announcements until they message the temple number."
              : "Update this devotee's details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappPhone">Phone number</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="whatsappPhone"
                placeholder="+91XXXXXXXXXX"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
              <div className="relative">
                <Cake className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthStar">Birth star / Nakshatram (optional)</Label>
              <div className="relative">
                <Sparkles className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="birthStar"
                  value={birthStar}
                  onChange={(e) => setBirthStar(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ancestralLineage">Gothram / Ancestral lineage (optional)</Label>
            <div className="relative">
              <Users className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ancestralLineage"
                value={ancestralLineage}
                onChange={(e) => setAncestralLineage(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-saffron" />
                <div>
                  <p className="text-sm font-medium">Event notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically notify about new, updated, or cancelled events.
                  </p>
                </div>
              </div>
              <Switch checked={eventNotificationsEnabled} onCheckedChange={setEventNotificationsEnabled} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
