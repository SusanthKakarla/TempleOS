"use client";

import { useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Megaphone } from "lucide-react";
import type { Event } from "@/types/db";
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
import { Progress } from "@/components/ui/progress";

type Phase = "confirm" | "sending" | "done";

interface AnnounceResult {
  total: number;
  sent: number;
  failed: number;
}

export function AnnounceDialog({
  event,
  trigger,
  onAnnounced,
}: {
  event: Event;
  trigger: ReactElement;
  onAnnounced: () => void;
}) {
  const t = useTranslations("events.announceDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnnounceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;

    setPhase("confirm");
    setResult(null);
    setError(null);
    setRecipientCount(null);
    fetch("/api/devotees")
      .then((res) => res.json())
      .then((body: { devotees?: { whatsappOptInStatus: boolean }[] }) => {
        const count = (body.devotees ?? []).filter((d) => d.whatsappOptInStatus).length;
        setRecipientCount(count);
      })
      .catch(() => setRecipientCount(null));
  }

  async function handleSend() {
    setError(null);
    setPhase("sending");
    setProgress(8);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 88 ? p + Math.random() * 12 : p));
    }, 250);

    try {
      const response = await fetch(`/api/events/${event.id}/announce`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as AnnounceResult & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("errorFallback"));
      }
      setProgress(100);
      setResult({ total: body.total, sent: body.sent, failed: body.failed });
      setPhase("done");
      onAnnounced();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
      setPhase("confirm");
    } finally {
      if (progressTimer.current) clearInterval(progressTimer.current);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4.5 text-saffron" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {phase === "done" ? t("descriptionDone") : t("descriptionConfirm", { title: event.title })}
          </DialogDescription>
        </DialogHeader>

        {phase !== "done" && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{event.title}</p>
            <p className="text-muted-foreground">
              {recipientCount === null
                ? t("checkingRecipients")
                : t("recipientCount", { count: recipientCount })}
            </p>
          </div>
        )}

        {phase === "sending" && <Progress value={progress} />}

        {phase === "done" && result && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-10 text-emerald" />
            <p className="text-sm">
              <span className="font-semibold text-emerald">{t("sentResult", { count: result.sent })}</span>
              {result.failed > 0 && (
                <span className="text-destructive"> &middot; {t("failedResult", { count: result.failed })}</span>
              )}
              {result.total === 0 && ` — ${t("noRecipients")}`}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {phase === "done" ? (
            <Button onClick={() => setOpen(false)}>{tCommon("close")}</Button>
          ) : (
            <Button onClick={handleSend} disabled={phase === "sending" || recipientCount === 0}>
              {phase === "sending" ? t("sending") : t("send")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
