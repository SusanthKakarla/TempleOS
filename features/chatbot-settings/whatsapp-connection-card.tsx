"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import type { SupportedLanguage, WhatsAppAccount } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";

interface ConnectResult {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

interface WhatsAppConnectionCardProps {
  account: WhatsAppAccount | null;
  initialConnectResult: ConnectResult | null;
  initialCancelled: boolean;
  /** Compact single-row "Connected" summary instead of the full card — used once WhatsApp is already connected, so the connection details don't dominate the page. */
  compact?: boolean;
}

export function WhatsAppConnectionCard({
  account,
  initialConnectResult,
  initialCancelled,
  compact = false,
}: WhatsAppConnectionCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("chatbotSettings.whatsappConnection");
  const [pending, setPending] = useState<"connect" | "disconnect" | "finishing" | null>(
    initialConnectResult ? "finishing" : null,
  );
  const handledInitialResultRef = useRef(false);

  const isConnected = account !== null && account.status === "connected";

  async function submitConnectResult({ code, wabaId, phoneNumberId }: ConnectResult) {
    // No setPending() here — the initial pending state is already "finishing"
    // for this mount-triggered path (see useState above), so setting it again
    // synchronously from the effect that calls this would trigger a
    // react-hooks/set-state-in-effect lint violation for no behavioral benefit.
    try {
      const response = await fetch("/api/whatsapp/connect/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, wabaId, phoneNumberId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("connectError"));
      }
      toast.success(t("connectSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("connectError"));
    } finally {
      setPending(null);
      router.replace(pathname);
      router.refresh();
    }
  }

  useEffect(() => {
    if (handledInitialResultRef.current) return;
    handledInitialResultRef.current = true;

    if (initialConnectResult) {
      void submitConnectResult(initialConnectResult);
    } else if (initialCancelled) {
      toast.info(t("connectCancelled"));
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount against the props the page decoded server-side
  }, []);

  async function handleConnect() {
    setPending("connect");
    try {
      const response = await fetch("/api/whatsapp/connect/start", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { onboardingUrl?: string; error?: string };
      if (!response.ok || !body.onboardingUrl) {
        throw new Error(body.error ?? t("sdkLoadError"));
      }
      window.location.href = body.onboardingUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sdkLoadError"));
      setPending(null);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(t("disconnectConfirm"))) return;
    setPending("disconnect");
    try {
      const response = await fetch("/api/whatsapp/disconnect", { method: "POST" });
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

  if (compact && isConnected && account) {
    return (
      <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
          <MessageCircle className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{account.phoneNumber}</p>
          <p className="truncate text-xs text-muted-foreground">{account.businessName ?? t("cardTitle")}</p>
        </div>
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="size-3.5" />
          {t("statusConnected")}
        </Badge>
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={handleDisconnect}>
          {pending === "disconnect" ? t("disconnecting") : t("disconnectButton")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4.5 text-emerald" />
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
            <Field label={t("fields.businessName")} value={account.businessName ?? "—"} />
            <Field label={t("fields.phoneNumber")} value={account.phoneNumber} />
            <Field label={t("fields.wabaId")} value={account.metaBusinessAccountId} />
            <Field
              label={t("fields.connectedAt")}
              value={account.connectedAt ? formatDate(account.connectedAt, locale) : "—"}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("fields.phoneStatus")}</p>
              <Badge variant="secondary">{account.phoneVerificationStatus ?? "Unknown"}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("fields.webhookStatus")}</p>
              <Badge
                variant={account.webhookSubscribed ? "default" : "secondary"}
                className="gap-1"
              >
                {account.webhookSubscribed ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {account.webhookSubscribed ? t("webhookSubscribed") : t("webhookNotSubscribed")}
              </Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("notConnectedState")}</p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {isConnected ? (
          <>
            <Button variant="outline" disabled={pending !== null} onClick={handleConnect} className="gap-1.5">
              <RefreshCw className={pending === "connect" ? "size-4 animate-spin" : "size-4"} />
              {pending === "connect" ? t("connecting") : t("reconnectButton")}
            </Button>
            <Button variant="ghost" disabled={pending !== null} onClick={handleDisconnect}>
              {pending === "disconnect" ? t("disconnecting") : t("disconnectButton")}
            </Button>
          </>
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
