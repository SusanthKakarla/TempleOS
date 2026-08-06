"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CreditCard, Save, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TenantPaymentAccount } from "@/types/db";

interface PhonePeConnectionFormProps {
  tenantId: string;
  account: TenantPaymentAccount | null;
}

interface FormState {
  merchantId: string;
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "production";
  webhookSecret: string;
}

interface FormErrors {
  message?: string;
}

const BLANK_FORM: FormState = { merchantId: "", clientId: "", clientSecret: "", environment: "production", webhookSecret: "" };

/**
 * Super Admin counterpart to RazorpayConnectionForm for PhonePe — same
 * "validate live before persisting" posture, same shape. Unlike Razorpay,
 * PhonePe has no Partner OAuth flow, so this manual form (mirrored on the
 * tenant self-service side by PhonePeConnectionCard) is the ONLY way to
 * connect PhonePe, not a super-admin-only fallback.
 */
export function PhonePeConnectionForm({ tenantId, account }: PhonePeConnectionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const submittingRef = useRef(false);

  const isConnected = account !== null && account.status === "connected" && account.providerKey === "phonepe";

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
      const response = await fetch(`/api/super-admin/temples/${tenantId}/payments/phonepe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: form.merchantId,
          clientId: form.clientId,
          clientSecret: form.clientSecret,
          environment: form.environment,
          webhookSecret: form.webhookSecret || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; statusCode?: number | string | null };
      if (!response.ok) {
        const detail = body.error || "Could not verify PhonePe credentials.";
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
            PhonePe Connection
          </span>
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connected" : "Not Connected"}</Badge>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {isConnected && account && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Merchant ID</p>
                <p className="text-sm font-medium">{account.providerMerchantId ?? "—"}</p>
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
              id="phonepe-super-admin-merchant-id"
              label="Merchant ID"
              value={form.merchantId}
              onChange={(event) => updateField("merchantId", event.target.value)}
              required
            />
            <LabeledInput
              id="phonepe-super-admin-client-id"
              label="Client ID"
              value={form.clientId}
              onChange={(event) => updateField("clientId", event.target.value)}
              required
            />
            <LabeledInput
              id="phonepe-super-admin-client-secret"
              label="Client Secret"
              type="password"
              value={form.clientSecret}
              onChange={(event) => updateField("clientSecret", event.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Environment</label>
              <Select value={form.environment} onValueChange={(v) => updateField("environment", v as "sandbox" | "production")}>
                <SelectTrigger size="lg" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production (live)</SelectItem>
                  <SelectItem value="sandbox">Sandbox (testing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LabeledInput
              id="phonepe-super-admin-webhook-secret"
              label="Webhook Secret (username:password, optional)"
              type="password"
              value={form.webhookSecret}
              onChange={(event) => updateField("webhookSecret", event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Client Secret and Webhook Secret are encrypted at rest and never shown again after saving — re-enter them
            here to replace the stored values.
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
