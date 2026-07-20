"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import type { SupportedLanguage, WhatsAppAccount } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
  }
}

const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const FACEBOOK_MESSAGE_ORIGIN = "https://www.facebook.com";

interface EmbeddedSignupData {
  wabaId: string;
  phoneNumberId: string;
}

function loadFacebookSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FACEBOOK_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Meta SDK")));
      return;
    }
    const script = document.createElement("script");
    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Meta SDK"));
    document.body.appendChild(script);
  });
}

export function WhatsAppConnectionCard({ account }: { account: WhatsAppAccount | null }) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("chatbotSettings.whatsappConnection");
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const signupDataRef = useRef<EmbeddedSignupData | null>(null);
  const signupCodeRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  const isConnected = account !== null && account.status === "connected";

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== FACEBOOK_MESSAGE_ORIGIN) return;
      let data: unknown;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (
        typeof data !== "object" ||
        data === null ||
        (data as { type?: unknown }).type !== "WA_EMBEDDED_SIGNUP"
      ) {
        return;
      }
      const payload = data as { event?: string; data?: { waba_id?: string; phone_number_id?: string } };
      if (payload.event === "FINISH" || payload.event === "FINISH_ONLY_WABA") {
        const wabaId = payload.data?.waba_id;
        const phoneNumberId = payload.data?.phone_number_id;
        if (wabaId && phoneNumberId) {
          signupDataRef.current = { wabaId, phoneNumberId };
          void maybeSubmit();
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- maybeSubmit closes over refs only, stable across renders
  }, []);

  async function maybeSubmit() {
    if (submittedRef.current) return;
    if (!signupDataRef.current || !signupCodeRef.current) return;
    submittedRef.current = true;

    const { wabaId, phoneNumberId } = signupDataRef.current;
    const code = signupCodeRef.current;

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
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("connectError"));
    } finally {
      setPending(null);
      signupDataRef.current = null;
      signupCodeRef.current = null;
      submittedRef.current = false;
    }
  }

  async function handleConnect() {
    const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
    if (!appId || !configId) {
      toast.error(t("sdkLoadError"));
      return;
    }

    setPending("connect");
    signupDataRef.current = null;
    signupCodeRef.current = null;
    submittedRef.current = false;

    try {
      await loadFacebookSdk();
      window.FB?.init({ appId, version: "v21.0" });
    } catch {
      toast.error(t("sdkLoadError"));
      setPending(null);
      return;
    }

    window.FB?.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code || response.status !== "connected") {
          // User closed the popup or declined — not an error, just reset.
          setPending(null);
          return;
        }
        signupCodeRef.current = code;
        void maybeSubmit();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
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
