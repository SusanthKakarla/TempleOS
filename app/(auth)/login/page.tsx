"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { devLog, getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { useDefaultCountry } from "@/lib/countries";
import { CountryCodeSelect } from "@/features/auth/country-code-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  // Defaults to India during SSR/first paint, then refines to the browser's
  // detected locale — see useDefaultCountry's comment. `countryOverride`
  // holds the user's own pick once they open the picker, which must win over
  // the detected default on every subsequent render.
  const detectedCountry = useDefaultCountry();
  const [countryOverride, setCountryOverride] = useState<CountryCode | null>(null);
  const countryIso = countryOverride ?? detectedCountry;
  const [phone, setPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  // A single invisible reCAPTCHA verifier is created lazily and reused across
  // every send/resend attempt, per Firebase's recommended pattern. Recreating
  // it on every call (the previous bug here) leaves a stale widget attached
  // to the DOM and breaks the second attempt without a full page refresh.
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      devLog("Unmounting login page, clearing reCAPTCHA verifier");
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  function getOrCreateVerifier(): RecaptchaVerifier {
    if (verifierRef.current) return verifierRef.current;
    if (!recaptchaContainerRef.current) {
      throw new Error("Recaptcha container is missing");
    }

    devLog("Initializing reCAPTCHA verifier");
    const auth = getFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
      callback: () => devLog("reCAPTCHA solved"),
      "expired-callback": () => {
        devLog("reCAPTCHA expired; it will be recreated on the next attempt");
        verifierRef.current?.clear();
        verifierRef.current = null;
      },
    });
    verifierRef.current = verifier;
    return verifier;
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const normalized = normalizePhoneNumber(phone, countryIso);
    if (!normalized) {
      setError("Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      devLog("Requesting OTP for", normalized);
      const auth = getFirebaseAuth();
      const verifier = getOrCreateVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalized, verifier);
      devLog("OTP sent successfully");
      setFullPhone(normalized);
      setStep("otp");
    } catch (err) {
      devLog("Failed to send OTP", err);
      // The widget may be left in a used/invalid state after any failure —
      // clear it so the next attempt (retry, or a different number) always
      // gets a fresh one instead of silently failing.
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(getFirebaseErrorMessage(err, "Failed to send the login code"));
    } finally {
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
    setStep("phone");
    setOtp("");
    setError(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>TempleOS Admin</CardTitle>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send code"}
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
    </main>
  );
}
