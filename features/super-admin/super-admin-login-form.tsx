"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmbientBackground } from "@/features/dashboard/ambient-background";
import { CountryCodeSelect } from "@/features/auth/country-code-select";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { devLog, getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { normalizePhoneNumber } from "@/lib/phone.mts";

type Step = "phone" | "otp";

interface SuperAdminLoginFormProps {
  redirectPath: string;
}

export function SuperAdminLoginForm({ redirectPath }: SuperAdminLoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [countryOverride, setCountryOverride] = useState<CountryCode | null>(null);
  const countryIso = countryOverride ?? "IN";
  const [phone, setPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendBlocked, setSendBlocked] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetContainerRef = useRef<HTMLDivElement | null>(null);
  const sendingOtpRef = useRef(false);
  const verifyingOtpRef = useRef(false);
  const sendBlockedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetVerifier() {
    try {
      verifierRef.current?.clear();
    } catch (err) {
      devLog("Failed to clear Super Admin reCAPTCHA verifier", err);
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
    return () => {
      devLog("Unmounting Super Admin login page, clearing reCAPTCHA verifier");
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

    devLog("Initializing Super Admin reCAPTCHA verifier");
    const auth = getFirebaseAuth();
    const widgetContainer = document.createElement("div");
    recaptchaContainerRef.current.replaceChildren(widgetContainer);
    recaptchaWidgetContainerRef.current = widgetContainer;
    const verifier = new RecaptchaVerifier(auth, widgetContainer, {
      size: "invisible",
      callback: () => devLog("Super Admin reCAPTCHA solved"),
      "expired-callback": () => {
        devLog("Super Admin reCAPTCHA expired; it will be recreated on the next attempt");
        resetVerifier();
      },
    });
    verifierRef.current = verifier;
    return verifier;
  }

  async function requestOtp(normalized: string, options?: { isResend?: boolean }) {
    setLoading(true);
    try {
      devLog("Requesting Super Admin OTP for", normalized);
      const auth = getFirebaseAuth();
      const verifier = getOrCreateVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalized, verifier);
      devLog("Super Admin OTP sent successfully");
      resetVerifier();
      setFullPhone(normalized);
      setStep("otp");
      setOtp("");
      setStatusMessage(options?.isResend ? "A new login code was sent." : null);
    } catch (err) {
      devLog("Failed to send Super Admin OTP", err);
      confirmationRef.current = null;
      if (getFirebaseErrorCode(err) === "auth/too-many-requests") {
        setSendBlocked(true);
        sendBlockedTimeoutRef.current = setTimeout(() => {
          setSendBlocked(false);
          sendBlockedTimeoutRef.current = null;
        }, 60_000);
      }
      resetVerifier();
      setError(getFirebaseErrorMessage(err, "Failed to send the login code"));
    } finally {
      sendingOtpRef.current = false;
      setLoading(false);
    }
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    if (sendingOtpRef.current || sendBlocked) return;
    sendingOtpRef.current = true;
    setError(null);
    setStatusMessage(null);

    const normalized = normalizePhoneNumber(phone, countryIso);
    if (!normalized) {
      setError("Enter a valid phone number");
      sendingOtpRef.current = false;
      return;
    }

    await requestOtp(normalized);
  }

  async function handleResendOtp() {
    if (sendingOtpRef.current || sendBlocked || !fullPhone) return;
    sendingOtpRef.current = true;
    setError(null);
    setStatusMessage(null);
    confirmationRef.current = null;
    resetVerifier();
    await requestOtp(fullPhone, { isResend: true });
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (verifyingOtpRef.current) return;
    verifyingOtpRef.current = true;
    setError(null);
    setStatusMessage(null);
    setLoading(true);
    try {
      if (!confirmationRef.current) {
        throw new Error("Start over: request a login code first");
      }
      devLog("Verifying Super Admin OTP");
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      devLog("Super Admin OTP verified, exchanging Firebase ID token for a session");

      const response = await fetch("/api/super-admin/auth/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
        devLog("Super Admin session creation failed", response.status, body.error);
        if (body.code === "NOT_AUTHORIZED") {
          throw new Error("This phone number is not authorized for Super Admin access.");
        }
        if (body.code === "FIREBASE_UID_MISMATCH") {
          throw new Error("This phone number is already linked to a different Firebase account.");
        }
        throw new Error(body.error ?? "Sign-in failed");
      }

      devLog("Super Admin session created, redirecting");
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      devLog("Failed to verify Super Admin OTP", err);
      setError(getFirebaseErrorMessage(err, "Failed to verify the login code"));
    } finally {
      verifyingOtpRef.current = false;
      setLoading(false);
    }
  }

  function handleUseDifferentNumber() {
    confirmationRef.current = null;
    resetVerifier();
    setStep("phone");
    setOtp("");
    setError(null);
    setStatusMessage(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AmbientBackground />
      <Card className="glass-card w-full max-w-sm rounded-2xl">
        <CardHeader>
          <CardTitle>Super Admin</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Enter your phone number to receive a login code."
              : `Enter the code sent to ${fullPhone}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="flex gap-2">
                  <CountryCodeSelect value={countryIso} onChange={setCountryOverride} />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || sendBlocked}>
                {loading ? "Sending..." : sendBlocked ? "Wait before retrying" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOtp}
                disabled={loading || sendBlocked}
              >
                {sendBlocked ? "Wait before retrying" : "Request a new code"}
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
    </main>
  );
}
