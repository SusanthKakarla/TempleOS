"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Step = "bootstrapping" | "syncing" | "ready" | "error";

interface SetupResult {
  bootstrap: { created: string[]; alreadyExisted: string[] };
  sync: { checked: number; approved: number; stillPending: number; failed: number };
}

/**
 * Narrates the single POST /api/whatsapp/templates/setup call as a 3-step
 * flow (bootstrap → check Meta → ready) — there's no queue/worker
 * infrastructure in this codebase for genuinely separate steps, so the step
 * transition is a cosmetic minimum-duration wait alongside the one real
 * request, same spirit as whatsapp-onboarding-flow.tsx's
 * idle→connecting→finishing narrative over one flow.
 *
 * The parent must remount this component on every open (e.g. `key={openCount}`
 * on the Sparkles button's onClick) rather than this component resetting its
 * own state via a `useEffect([open])` — calling setState synchronously at the
 * top of an effect body is exactly the cascading-render anti-pattern the
 * react-hooks/set-state-in-effect rule flags; a fresh mount gives clean
 * initial state for free instead.
 */
export function WhatsAppTemplateSetupWizard({
  onOpenChange,
  onCompleted,
}: {
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const t = useTranslations("chatbotSettings.whatsappTemplateSetup");
  const [step, setStep] = useState<Step>("bootstrapping");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const minStepDelay = new Promise((resolve) => setTimeout(resolve, 700));

    async function run() {
      try {
        const [response] = await Promise.all([fetch("/api/whatsapp/templates/setup", { method: "POST" }), minStepDelay]);
        if (cancelled) return;
        setStep("syncing");

        const body = (await response.json().catch(() => ({}))) as SetupResult & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? t("setupError"));
        }
        if (cancelled) return;
        setResult(body);
        setStep("ready");
        onCompleted();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("setupError"));
        setStep("error");
        toast.error(t("setupError"));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run exactly once per mount (i.e. once per open, via the parent's key remount)
  }, []);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("wizardTitle")}</DialogTitle>
          <DialogDescription>{t("wizardDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <StepRow
            label={t("stepBootstrap")}
            state={step === "bootstrapping" ? "active" : "done"}
          />
          <StepRow
            label={t("stepSync")}
            state={step === "bootstrapping" ? "pending" : step === "syncing" ? "active" : step === "error" ? "pending" : "done"}
          />
          <StepRow
            label={t("stepReady")}
            state={step === "ready" ? "done" : step === "error" ? "error" : "pending"}
          />
        </div>

        {step === "ready" && result && (
          <p className="text-sm text-muted-foreground">
            {t("resultSummary", {
              created: result.bootstrap.created.length,
              approved: result.sync.approved,
              pending: result.sync.stillPending,
            })}
          </p>
        )}
        {step === "error" && error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} disabled={step === "bootstrapping" || step === "syncing"}>
            {step === "ready" || step === "error" ? t("close") : t("wizardWorking")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({ label, state }: { label: string; state: "pending" | "active" | "done" | "error" }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {state === "done" && <CheckCircle2 className="size-4 shrink-0 text-emerald" />}
      {state === "active" && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
      {state === "error" && <XCircle className="size-4 shrink-0 text-destructive" />}
      {state === "pending" && <div className="size-4 shrink-0 rounded-full border border-muted-foreground/30" />}
      <span className={state === "pending" ? "text-muted-foreground" : ""}>{label}</span>
    </div>
  );
}
