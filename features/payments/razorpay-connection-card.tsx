"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import type { TenantPaymentAccount } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";

interface RazorpayConnectionCardProps {
  account: TenantPaymentAccount | null;
}

interface FormState {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  businessName: string;
  merchantName: string;
  contactEmail: string;
  contactPhone: string;
}

const BLANK_FORM: FormState = {
  keyId: "",
  keySecret: "",
  webhookSecret: "",
  businessName: "",
  merchantName: "",
  contactEmail: "",
  contactPhone: "",
};

/** Mirrors features/chatbot-settings/whatsapp-connection-card.tsx's connected/not-connected card shape — the tenant-admin self-service counterpart to the Super Admin provisioning wizard's Payment step. */
export function RazorpayConnectionCard({ account }: RazorpayConnectionCardProps) {
  const router = useRouter();
  const t = useTranslations("paymentSettings.connection");
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = account !== null && account.status === "connected";

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
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
          businessName: form.businessName,
          merchantName: form.merchantName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
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
            <Field label={t("fields.businessName")} value={account.businessName} />
            <Field label={t("fields.merchantName")} value={account.merchantName} />
            <Field label={t("fields.contactEmail")} value={account.contactEmail} />
            <Field label={t("fields.contactPhone")} value={account.contactPhone} />
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-muted-foreground">{t("fields.validationStatus")}</p>
              <Badge variant={account.lastValidationError ? "destructive" : "default"} className="gap-1">
                {account.lastValidationError ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                {account.lastValidationError ?? (account.lastValidatedAt ? t("validated") : t("validationPending"))}
              </Badge>
            </div>
          </div>
        ) : (
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
            <LabeledInput
              id="payment-business-name"
              label={t("fields.businessName")}
              value={form.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
            />
            <LabeledInput
              id="payment-merchant-name"
              label={t("fields.merchantName")}
              value={form.merchantName}
              onChange={(event) => updateField("merchantName", event.target.value)}
            />
            <LabeledInput
              id="payment-contact-email"
              label={t("fields.contactEmail")}
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
            />
            <LabeledInput
              id="payment-contact-phone"
              label={t("fields.contactPhone")}
              value={form.contactPhone}
              onChange={(event) => updateField("contactPhone", event.target.value)}
            />
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {isConnected ? (
          <Button variant="outline" disabled={pending !== null} onClick={handleDisconnect}>
            {pending === "disconnect" ? t("disconnecting") : t("disconnectButton")}
          </Button>
        ) : (
          <Button disabled={pending !== null} onClick={handleConnect}>
            {pending === "connect" ? t("connecting") : t("connectButton")}
          </Button>
        )}
      </CardFooter>
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
