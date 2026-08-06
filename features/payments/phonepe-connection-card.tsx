"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import type { TenantPaymentAccount } from "@/types/db";
import { manualConnectPhonepeSchema } from "@/lib/validation/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhonePeConnectionCardProps {
  account: TenantPaymentAccount | null;
}

/**
 * Mirrors RazorpayConnectionCard's card shape (status badge, single primary
 * CTA, Reconnect/Disconnect footer). PhonePe has no self-serve OAuth
 * "Partner" onboarding API the way Razorpay does — verified live against
 * developer.phonepe.com and PhonePe's own merchant-aggregator signup form
 * (a manual KYC business process, not a redirect flow a platform can
 * drive) — so unlike Razorpay's genuine one-click OAuth, "Connect PhonePe"
 * here opens a single credential dialog rather than redirecting anywhere.
 * The previous multi-step "Guided Setup" wizard and separate "Manual
 * Configuration" tab have been removed in favor of this one dialog — same
 * underlying PUT /api/payments/accounts/phonepe route, no new backend.
 */
export function PhonePeConnectionCard({ account }: PhonePeConnectionCardProps) {
  const router = useRouter();
  const t = useTranslations("paymentSettings.phonepe");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = account !== null && account.status === "connected" && account.providerKey === "phonepe";
  const isFailed = account !== null && account.providerKey === "phonepe" && !!account.lastValidationError;

  function resetForm() {
    setMerchantId("");
    setClientId("");
    setClientSecret("");
    setEnvironment("production");
    setWebhookSecret("");
    setError(null);
  }

  async function handleConnect() {
    setError(null);
    const parsed = manualConnectPhonepeSchema.safeParse({
      merchantId,
      clientId,
      clientSecret,
      environment,
      webhookSecret: webhookSecret.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return;
    }
    setPending("connect");
    try {
      const response = await fetch("/api/payments/accounts/phonepe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("connect.connectError"));
      }
      toast.success(t("connect.connectSuccess"));
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("connect.connectError"));
    } finally {
      setPending(null);
    }
  }

  async function handleDisconnect() {
    if (!account || !window.confirm(t("disconnectConfirm"))) return;
    setPending("disconnect");
    try {
      const response = await fetch(`/api/payments/accounts/${account.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("disconnectError"));
      }
      toast.success(t("disconnectSuccess"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("disconnectError"));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4.5 text-primary" />
          {t("cardTitle")}
        </CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={isConnected ? "default" : isFailed ? "destructive" : "secondary"} className="w-fit">
          {isConnected ? t("statusConnected") : isFailed ? t("statusFailed") : t("statusNotConnected")}
        </Badge>

        {isConnected && account ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("fields.merchantId")} value={account.providerMerchantId ?? "—"} />
            <Field
              label={t("fields.environment")}
              value={account.environment === "sandbox" ? t("connect.environmentSandbox") : t("connect.environmentProduction")}
            />
            <Field
              label={t("fields.connectedAt")}
              value={new Date(account.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("fields.validationStatus")}</p>
              <Badge variant={account.lastValidationError ? "destructive" : "default"} className="gap-1">
                {account.lastValidationError ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                {account.lastValidationError ?? (account.lastValidatedAt ? t("validated") : t("validationPending"))}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("connect.description")}</p>
            {isFailed && account?.lastValidationError && <p className="text-sm text-destructive">{account.lastValidationError}</p>}
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              {isFailed ? t("connect.reconnectButton") : t("connect.connectButton")}
            </Button>
          </div>
        )}
      </CardContent>
      {isConnected && account ? (
        <CardFooter className="gap-2">
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            {t("connect.reconnectButton")}
          </Button>
          <Button variant="outline" disabled={pending !== null} onClick={handleDisconnect}>
            {pending === "disconnect" ? t("disconnecting") : t("disconnectButton")}
          </Button>
        </CardFooter>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("connect.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("connect.dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <LabeledInput
              id="phonepe-merchant-id"
              label={t("connect.merchantId")}
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              required
            />
            <LabeledInput
              id="phonepe-client-id"
              label={t("connect.clientId")}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
            <LabeledInput
              id="phonepe-client-secret"
              label={t("connect.clientSecret")}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("connect.environment")}</label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
                <SelectTrigger size="lg" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">{t("connect.environmentProduction")}</SelectItem>
                  <SelectItem value="sandbox">{t("connect.environmentSandbox")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LabeledInput
              id="phonepe-webhook-secret"
              label={t("connect.webhookSecret")}
              placeholder="username:password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("connect.webhookSecretHelp")}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={pending !== null} onClick={() => setDialogOpen(false)}>
              {t("connect.cancelButton")}
            </Button>
            <Button disabled={pending !== null} onClick={handleConnect}>
              {pending === "connect" ? t("connect.connecting") : t("connect.saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
