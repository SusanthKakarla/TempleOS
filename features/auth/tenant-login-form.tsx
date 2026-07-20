"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { devLog, getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { CountryCodeSelect } from "@/features/auth/country-code-select";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "phone" | "otp";

export function TenantLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [countryOverride, setCountryOverride] = useState<CountryCode | null>(null);
  const countryIso = countryOverride ?? "IN";
  const [phone, setPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tenantContextLoading, setTenantContextLoading] = useState(true);
  const [tenantContextError, setTenantContextError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendBlocked, setSendBlocked] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetContainerRef = useRef<HTMLDivElement | null>(null);
  const sendingOtpRef = useRef(false);
  const sendBlockedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetVerifier() {
    try {
      verifierRef.current?.clear();
    } catch (err) {
      devLog("Failed to clear reCAPTCHA verifier", err);
    }
    verifierRef.current = null;
    recaptchaWidgetContainerRef.current?.remove();
    recaptchaWidgetContainerRef.current = null;
  }

  function getFirebaseErrorCode(err: unknown): string | undefined {
    if (typeof err === "object" && err !== null && "code" in err) {
      const code = (err as { code: unknown }).code;
      return typeof code === "string" ? code : undefined;
    }
    return undefined;
  }

  useEffect(() => {
    let cancelled = false;

    async function verifyTenantContext() {
      try {
        const response = await fetch("/api/auth/tenant-context", { method: "GET" });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          tenant?: { name?: string };
        };
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to verify this temple subdomain.");
        }
        if (!cancelled) {
          setTenantName(body.tenant?.name?.trim() || null);
        }
      } catch (err) {
        if (!cancelled) {
          setTenantContextError(err instanceof Error ? err.message : "Unable to verify this temple subdomain.");
        }
      } finally {
        if (!cancelled) {
          setTenantContextLoading(false);
        }
      }
    }

    void verifyTenantContext();

    return () => {
      cancelled = true;
      devLog("Unmounting login page, clearing reCAPTCHA verifier");
      if (sendBlockedTimeoutRef.current) {
        clearTimeout(sendBlockedTimeoutRef.current);
      }
      resetVerifier();
    };
  }, []);

  function getOrCreateVerifier(): RecaptchaVerifier {
    if (verifierRef.current) return verifierRef.current;
    if (!recaptchaContainerRef.current) {
      throw new Error("Recaptcha container is missing");
    }

    devLog("Initializing reCAPTCHA verifier");
    const auth = getFirebaseAuth();
    const widgetContainer = document.createElement("div");
    recaptchaContainerRef.current.replaceChildren(widgetContainer);
    recaptchaWidgetContainerRef.current = widgetContainer;
    const verifier = new RecaptchaVerifier(auth, widgetContainer, {
      size: "invisible",
      callback: () => devLog("reCAPTCHA solved"),
      "expired-callback": () => {
        devLog("reCAPTCHA expired; it will be recreated on the next attempt");
        resetVerifier();
      },
    });
    verifierRef.current = verifier;
    return verifier;
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    if (sendingOtpRef.current || sendBlocked || tenantContextLoading || tenantContextError) return;
    sendingOtpRef.current = true;
    setError(null);

    const normalized = normalizePhoneNumber(phone, countryIso);
    if (!normalized) {
      setError("Enter a valid phone number");
      sendingOtpRef.current = false;
      return;
    }

    setLoading(true);
    try {
      devLog("Requesting OTP for", normalized);
      const auth = getFirebaseAuth();
      const verifier = getOrCreateVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalized, verifier);
      devLog("OTP sent successfully");
      resetVerifier();
      setFullPhone(normalized);
      setStep("otp");
    } catch (err) {
      devLog("Failed to send OTP", err);
      if (getFirebaseErrorCode(err) === "auth/too-many-requests") {
        setSendBlocked(true);
        sendBlockedTimeoutRef.current = setTimeout(() => {
          setSendBlocked(false);
          sendBlockedTimeoutRef.current = null;
        }, 60_000);
      }
      // The widget may be left in a used/invalid state after any failure —
      // clear it so the next attempt (retry, or a different number) always
      // gets a fresh one instead of silently failing.
      resetVerifier();
      setError(getFirebaseErrorMessage(err, "Failed to send the login code"));
    } finally {
      sendingOtpRef.current = false;
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!confirmationRef.current) {
        throw new Error("Start over: request a login code first");
      }
      devLog("Verifying OTP");
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      devLog("OTP verified, exchanging Firebase ID token for a session");

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
        devLog("Session creation failed", response.status, body.error);

        if (body.code === "NOT_AUTHORIZED") {
          // Authentication succeeded — the phone number just isn't provisioned
          // for dashboard access. That's a distinct outcome from a login
          // failure, so it gets its own page rather than an inline error.
          router.push(`/access-denied?phone=${encodeURIComponent(fullPhone)}`);
          return;
        }

        throw new Error(body.error ?? "Sign-in failed");
      }

      devLog("Session created, redirecting to dashboard");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      devLog("Failed to verify OTP", err);
      setError(getFirebaseErrorMessage(err, "Failed to verify the login code"));
    } finally {
      setLoading(false);
    }
  }

  function handleUseDifferentNumber() {
    confirmationRef.current = null;
    resetVerifier();
    setStep("phone");
    setOtp("");
    setError(null);
  }

  return (
    <Card className="glass-card w-full max-w-sm rounded-2xl">
      <CardHeader>
        <CardTitle>{tenantName ?? "TempleOS Admin"}</CardTitle>
        <CardDescription>
          {step === "phone"
            ? "Enter your phone number to receive a login code."
            : `Enter the code sent to ${fullPhone}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="flex gap-2">
              <CountryCodeSelect value={countryIso} onChange={setCountryOverride} />
              <FloatingLabelInput
                id="phone"
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                wrapperClassName="flex-1"
                required
              />
            </div>
            {(tenantContextError || error) && (
              <p className="text-sm text-destructive">{tenantContextError ?? error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || sendBlocked || tenantContextLoading || Boolean(tenantContextError)}
            >
              {tenantContextLoading
                ? "Checking temple..."
                : loading
                  ? "Sending..."
                  : sendBlocked
                    ? "Wait before retrying"
                    : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <FloatingLabelInput
              id="otp"
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleUseDifferentNumber}
            >
              Use a different number
            </Button>
          </form>
        )}
        <div ref={recaptchaContainerRef} />
      </CardContent>
    </Card>
  );
}
