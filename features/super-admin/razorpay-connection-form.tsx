"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CreditCard, Save, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { TenantPaymentAccount } from "@/types/db";

interface RazorpayConnectionFormProps {
  tenantId: string;
  account: TenantPaymentAccount | null;
}

interface FormState {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

interface FormErrors {
  message?: string;
}

const BLANK_FORM: FormState = { keyId: "", keySecret: "", webhookSecret: "" };

/**
 * Super Admin counterpart to WhatsAppConnectionForm — sets/updates a
 * temple's Razorpay Key ID/Key Secret/Webhook Secret from the Temples
 * detail page. The tenant's own Settings > Payments card only offers
 * Partner OAuth now, so this is the one remaining place to set manual keys
 * for an already-provisioned temple. Key Secret/Webhook Secret are never
 * pre-filled (they're encrypted at rest and never re-exposed) — every save
 * requires typing them fresh, same as the provisioning wizard's own manual
 * option and the tenant card's old manual form before it was removed.
 */
export function RazorpayConnectionForm({ tenantId, account }: RazorpayConnectionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const submittingRef = useRef(false);

  const isConnected = account !== null && account.status === "connected";

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors({});
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSaved(false);
    setErrors({});

    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: form.keyId,
          keySecret: form.keySecret,
          webhookSecret: form.webhookSecret || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        statusCode?: number | string | null;
      };
      if (!response.ok) {
        // The backend already resolves the most specific reason it can find
        // (Razorpay's own error description, a raw HTTP status, a network
        // failure message, ...) — display it as-is, appending the HTTP
        // status when present, and only fall back to a generic message if
        // the backend genuinely couldn't identify anything more specific.
        const detail = body.error || "Could not verify Razorpay credentials.";
        const statusSuffix = body.statusCode && !detail.includes(String(body.statusCode)) ? ` (HTTP ${body.statusCode})` : "";
        setErrors({ message: `${detail}${statusSuffix}` });
        return;
      }
      setForm(BLANK_FORM);
      setSaved(true);
      router.refresh();
    } catch {
      setErrors({ message: "Payment connection failed." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Disconnect this payment account? Online donations will stop working until reconnected.")) {
      return;
    }
    setDeleting(true);
    setErrors({});
    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/payments`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setErrors({ message: body.error ?? "Payment disconnection failed." });
        return;
      }
      router.refresh();
    } catch {
      setErrors({ message: "Payment disconnection failed." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CreditCard className="size-4.5 text-primary" />
            Payment Connection
          </span>
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connected" : "Not Connected"}</Badge>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {account && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Connection method</p>
                <p className="text-sm font-medium">
                  {account.connectionMethod === "partner" ? "Connect via Razorpay (Partner OAuth)" : "Manual API Keys"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Verification status</p>
                <Badge variant={account.lastValidationError ? "destructive" : "default"} className="gap-1">
                  {account.lastValidationError ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                  {account.lastValidationError ?? (account.lastValidatedAt ? "Verified" : "Verification pending")}
                </Badge>
              </div>
            </div>
          )}
          {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          {saved && <p className="text-sm text-emerald">Payment connection saved.</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              id="razorpay-super-admin-key-id"
              label="Razorpay Key ID"
              value={form.keyId}
              onChange={(event) => updateField("keyId", event.target.value)}
              required
            />
            <LabeledInput
              id="razorpay-super-admin-key-secret"
              label="Razorpay Key Secret"
              type="password"
              value={form.keySecret}
              onChange={(event) => updateField("keySecret", event.target.value)}
              required
            />
            <LabeledInput
              id="razorpay-super-admin-webhook-secret"
              label="Webhook Secret (optional)"
              type="password"
              value={form.webhookSecret}
              onChange={(event) => updateField("webhookSecret", event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Key Secret and Webhook Secret are encrypted at rest and never shown again after saving — re-enter them here
            to replace the stored values.
          </p>
        </CardContent>
        <div className="flex items-center justify-end gap-2 border-t px-(--card-spacing) pt-4">
          {isConnected && (
            <Button type="button" variant="destructive" disabled={submitting || deleting} onClick={handleDelete}>
              <Trash2 className="size-4" />
              {deleting ? "Deleting..." : "Delete Connection"}
            </Button>
          )}
          <Button type="submit" disabled={submitting || deleting}>
            <Save className="size-4" />
            {submitting ? "Saving..." : isConnected ? "Update Connection" : "Save Connection"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
