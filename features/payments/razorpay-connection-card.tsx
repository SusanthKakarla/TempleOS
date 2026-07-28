"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import type { TenantPaymentAccount } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RazorpayConnectionCardProps {
  account: TenantPaymentAccount | null;
}

interface FormState {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

const BLANK_FORM: FormState = {
  keyId: "",
  keySecret: "",
  webhookSecret: "",
};

/** Mirrors features/chatbot-settings/whatsapp-connection-card.tsx's connected/not-connected card shape — the tenant-admin self-service counterpart to the Super Admin provisioning wizard's Payment step. */
export function RazorpayConnectionCard({ account }: RazorpayConnectionCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("paymentSettings.connection");
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [method, setMethod] = useState<"manual" | "partner">("manual");
  const [pending, setPending] = useState<"connect" | "disconnect" | "oauth" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = account !== null && account.status === "connected";

  useEffect(() => {
    if (searchParams.get("razorpay_oauth_connected")) {
      toast.success(t("oauth.connected"));
      router.replace("/dashboard/settings/payments");
    } else if (searchParams.get("razorpay_oauth_error")) {
      toast.error(t("oauth.error"));
      router.replace("/dashboard/settings/payments");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the redirect query param itself changes
  }, [searchParams]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  async function handleConnectPartner() {
    setPending("oauth");
    setError(null);
    try {
      const response = await fetch("/api/payments/oauth/start", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !body.authorizeUrl) {
        throw new Error(body.error ?? t("oauth.startError"));
      }
      window.location.href = body.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("oauth.startError"));
      setPending(null);
    }
  }

  async function handleConnect() {
    setPending("connect");
    setError(null);
    try {
      const response = await fetch("/api/payments/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey: "razorpay",
          keyId: form.keyId,
          keySecret: form.keySecret,
          webhookSecret: form.webhookSecret || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("connectError"));
      }
      toast.success(t("connectSuccess"));
      setForm(BLANK_FORM);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("connectError"));
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
        <Badge variant={isConnected ? "default" : "secondary"} className="w-fit">
          {isConnected ? t("statusConnected") : t("statusNotConnected")}
        </Badge>

        {isConnected && account ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.connectionMethod")}
              value={account.connectionMethod === "partner" ? t("method.partnerValue") : t("method.manualValue")}
            />
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-muted-foreground">{t("fields.validationStatus")}</p>
              <Badge variant={account.lastValidationError ? "destructive" : "default"} className="gap-1">
                {account.lastValidationError ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                {account.lastValidationError ?? (account.lastValidatedAt ? t("validated") : t("validationPending"))}
              </Badge>
            </div>
          </div>
        ) : (
          <Tabs value={method} onValueChange={(value) => setMethod(value as "manual" | "partner")}>
            <TabsList>
              <TabsTrigger value="manual">{t("method.manualLabel")}</TabsTrigger>
              <TabsTrigger value="partner">{t("method.partnerLabel")}</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("method.manualDescription")}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabeledInput
                  id="razorpay-key-id"
                  label={t("fields.keyId")}
                  value={form.keyId}
                  onChange={(event) => updateField("keyId", event.target.value)}
                />
                <LabeledInput
                  id="razorpay-key-secret"
                  label={t("fields.keySecret")}
                  type="password"
                  value={form.keySecret}
                  onChange={(event) => updateField("keySecret", event.target.value)}
                />
                <LabeledInput
                  id="razorpay-webhook-secret"
                  label={t("fields.webhookSecret")}
                  type="password"
                  value={form.webhookSecret}
                  onChange={(event) => updateField("webhookSecret", event.target.value)}
                />
                {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              </div>
              <Button disabled={pending !== null} onClick={handleConnect}>
                {pending === "connect" ? t("connecting") : t("connectButton")}
              </Button>
            </TabsContent>
            <TabsContent value="partner" className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("method.partnerDescription")}</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button disabled={pending !== null} onClick={handleConnectPartner}>
                {pending === "oauth" ? t("oauth.redirecting") : t("oauth.connectButton")}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      {isConnected && account ? (
        <CardFooter className="gap-2">
          <Button variant="outline" disabled={pending !== null} onClick={handleDisconnect}>
            {pending === "disconnect" ? t("disconnecting") : t("disconnectButton")}
          </Button>
        </CardFooter>
      ) : null}
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
