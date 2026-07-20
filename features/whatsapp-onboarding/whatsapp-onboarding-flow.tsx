"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
  }
}

const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const FACEBOOK_MESSAGE_ORIGIN = "https://www.facebook.com";
const FACEBOOK_SDK_VERSION = "v25.0";
const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "FINISH_OBO_MIGRATION",
  "FINISH_GRANT_ONLY_API_ACCESS",
]);

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

export function WhatsAppOnboardingFlow({
  handoffToken,
  returnUrl,
}: {
  handoffToken: string;
  returnUrl: string;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "finishing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const signupDataRef = useRef<EmbeddedSignupData | null>(null);
  const signupCodeRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

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
      const payload = data as {
        event?: string;
        data?: { waba_id?: string; phone_number_id?: string; error_message?: string };
      };
      if (payload.event && FINISH_EVENTS.has(payload.event)) {
        const wabaId = payload.data?.waba_id;
        const phoneNumberId = payload.data?.phone_number_id;
        if (wabaId && phoneNumberId) {
          signupDataRef.current = { wabaId, phoneNumberId };
          void maybeComplete();
        }
      } else if (payload.event === "CANCEL") {
        window.location.href = `${returnUrl}?whatsapp_connect_error=cancelled`;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- maybeComplete closes over refs/props that don't change across renders
  }, []);

  async function maybeComplete() {
    if (submittedRef.current) return;
    if (!signupDataRef.current || !signupCodeRef.current) return;
    submittedRef.current = true;
    setStatus("finishing");

    const { wabaId, phoneNumberId } = signupDataRef.current;
    const code = signupCodeRef.current;

    try {
      const response = await fetch("/api/whatsapp/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoffToken, code, wabaId, phoneNumberId }),
      });
      const body = (await response.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (!response.ok || !body.redirectUrl) {
        throw new Error(body.error ?? "Failed to complete the WhatsApp connection.");
      }
      window.location.href = body.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete the WhatsApp connection.");
      setStatus("error");
      submittedRef.current = false;
    }
  }

  async function handleContinue() {
    const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
    if (!appId || !configId) {
      setError("WhatsApp Embedded Signup is not configured.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    setError(null);
    signupDataRef.current = null;
    signupCodeRef.current = null;
    submittedRef.current = false;

    try {
      await loadFacebookSdk();
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: FACEBOOK_SDK_VERSION });
    } catch {
      setError("Failed to load Meta's connection tool. Please retry.");
      setStatus("error");
      return;
    }

    window.FB?.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code || response.status !== "connected") {
          setStatus("idle");
          return;
        }
        signupCodeRef.current = code;
        void maybeComplete();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  }

  const busy = status === "connecting" || status === "finishing";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4.5" />
          Connect WhatsApp Business
        </CardTitle>
        <CardDescription>
          {status === "finishing"
            ? "Finishing up — you'll be redirected back to your dashboard in a moment."
            : "You'll be taken to Meta to connect your temple's WhatsApp Business Account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} onClick={handleContinue} className="w-full gap-1.5">
          <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
          {status === "connecting" ? "Connecting..." : status === "finishing" ? "Finishing..." : "Continue with Meta"}
        </Button>
        <a href={returnUrl} className="block text-center text-sm text-muted-foreground underline">
          Cancel and return to dashboard
        </a>
      </CardContent>
    </Card>
  );
}
