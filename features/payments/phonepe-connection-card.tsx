"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Copy, CreditCard, XCircle } from "lucide-react";
import type { TenantPaymentAccount } from "@/types/db";
import { manualConnectPhonepeSchema } from "@/lib/validation/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PhonePeConnectionCardProps {
  account: TenantPaymentAccount | null;
  tenantId: string;
}

type Method = "manual" | "guided";

function webhookUrlFor(tenantId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.trytempleos.com";
  return `${base.replace(/\/+$/, "")}/api/webhooks/phonepe/${tenantId}`;
}

/**
 * PhonePe has no self-serve OAuth "Partner" onboarding API the way Razorpay
 * does (verified live against developer.phonepe.com and PhonePe's own
 * merchant-aggregator signup form during this feature's research — merchant
 * approval there is a manual KYC business process, not a redirect flow a
 * platform can drive). Both tabs here end up submitting the same manual
 * credential form to the same route — "Guided Setup" only adds step-by-step
 * instructions above it, it does not skip credential entry, unlike
 * RazorpayConnectionCard's genuine one-click OAuth flow.
 */
export function PhonePeConnectionCard({ account, tenantId }: PhonePeConnectionCardProps) {
  const router = useRouter();
  const t = useTranslations("paymentSettings.phonepe");
  const [method, setMethod] = useState<Method>("guided");
  const [guidedConfirmed, setGuidedConfirmed] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isConnected = account !== null && account.status === "connected" && account.providerKey === "phonepe";
  const webhookUrl = webhookUrlFor(tenantId);

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
        throw new Error(body.error ?? t("manual.connectError"));
      }
      toast.success(t("manual.connectSuccess"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manual.connectError"));
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

  function copyWebhookUrl() {
    void navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
            <Field label={t("fields.merchantId")} value={account.providerMerchantId ?? "—"} />
            <Field
              label={t("fields.environment")}
              value={account.environment === "sandbox" ? t("manual.environmentSandbox") : t("manual.environmentProduction")}
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
          <div className="space-y-4">
            <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
              <TabsList className="w-full">
                <TabsTrigger value="guided" className="flex-1">
                  {t("methodTabs.guided")}
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  {t("methodTabs.manual")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {method === "guided" && !guidedConfirmed ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">{t("guided.intro")}</p>
                <ol className="space-y-3 text-sm">
                  <li>
                    <p className="font-medium">{t("guided.step1Title")}</p>
                    <p className="text-muted-foreground">{t("guided.step1Body")}</p>
                  </li>
                  <li>
                    <p className="font-medium">{t("guided.step2Title")}</p>
                    <p className="text-muted-foreground">{t("guided.step2Body")}</p>
                  </li>
                  <li>
                    <p className="font-medium">{t("guided.step3Title")}</p>
                    <p className="text-muted-foreground">{t("guided.step3Body")}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">{t("guided.webhookUrlLabel")}</p>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-1.5 text-xs">{webhookUrl}</code>
                        <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl} className="gap-1.5 shrink-0">
                          <Copy className="size-3.5" />
                          {copied ? t("guided.copied") : t("guided.copy")}
                        </Button>
                      </div>
                    </div>
                  </li>
                  <li>
                    <p className="font-medium">{t("guided.step4Title")}</p>
                  </li>
                </ol>
                <Button type="button" onClick={() => setGuidedConfirmed(true)} className="w-full">
                  {t("guided.continueButton")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <LabeledInput
                  id="phonepe-merchant-id"
                  label={t("manual.merchantId")}
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  required
                />
                <LabeledInput
                  id="phonepe-client-id"
                  label={t("manual.clientId")}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                />
                <LabeledInput
                  id="phonepe-client-secret"
                  label={t("manual.clientSecret")}
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("manual.environment")}</label>
                  <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
                    <SelectTrigger size="lg" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">{t("manual.environmentProduction")}</SelectItem>
                      <SelectItem value="sandbox">{t("manual.environmentSandbox")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <LabeledInput
                  id="phonepe-webhook-secret"
                  label={t("manual.webhookSecret")}
                  placeholder="username:password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("manual.webhookSecretHelp")}</p>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button disabled={pending !== null} onClick={handleConnect} className="w-full">
                  {pending === "connect" ? t("manual.connecting") : t("manual.connectButton")}
                </Button>
              </div>
            )}
          </div>
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
