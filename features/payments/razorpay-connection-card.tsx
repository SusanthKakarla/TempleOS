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

interface RazorpayConnectionCardProps {
  account: TenantPaymentAccount | null;
}

/**
 * Mirrors features/chatbot-settings/whatsapp-connection-card.tsx's
 * connected/not-connected card shape. Manual Key ID/Secret entry has been
 * removed from this self-service card — Partner OAuth ("Connect Razorpay")
 * is the only way a temple admin connects from here now. Manual keys are
 * still readable/displayed for tenants that connected that way earlier
 * (`account.connectionMethod === "manual"`), and the Super Admin
 * provisioning wizard keeps its own separate manual-keys option.
 */
export function RazorpayConnectionCard({ account }: RazorpayConnectionCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("paymentSettings.connection");
  const [pending, setPending] = useState<"disconnect" | "oauth" | null>(null);
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("method.partnerDescription")}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button disabled={pending !== null} onClick={handleConnectPartner}>
              {pending === "oauth" ? t("oauth.redirecting") : t("oauth.connectButton")}
            </Button>
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
