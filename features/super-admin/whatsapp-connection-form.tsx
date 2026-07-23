"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, MessageCircle, Save, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import type { WhatsAppAccount } from "@/types/db";

interface WhatsAppConnectionFormProps {
  tenantId: string;
  account: WhatsAppAccount | null;
}

interface FormState {
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  businessName: string;
}

interface FormErrors {
  message?: string;
}

function formStateFromAccount(account: WhatsAppAccount | null): FormState {
  return {
    phoneNumber: account?.phoneNumber ?? "",
    metaPhoneNumberId: account?.metaPhoneNumberId ?? "",
    metaBusinessAccountId: account?.metaBusinessAccountId ?? "",
    businessName: account?.businessName ?? "",
  };
}

export function WhatsAppConnectionForm({ tenantId, account }: WhatsAppConnectionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => formStateFromAccount(account));
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
      const response = await fetch(`/api/super-admin/temples/${tenantId}/whatsapp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: form.phoneNumber,
          metaPhoneNumberId: form.metaPhoneNumberId,
          metaBusinessAccountId: form.metaBusinessAccountId,
          businessName: form.businessName || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setErrors({ message: body.error ?? "WhatsApp connection failed." });
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setErrors({ message: "WhatsApp connection failed." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this WhatsApp connection? This permanently removes the mapping and cannot be undone.")) {
      return;
    }
    setDeleting(true);
    setErrors({});
    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/whatsapp`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setErrors({ message: body.error ?? "WhatsApp disconnection failed." });
        return;
      }
      setForm(formStateFromAccount(null));
      router.refresh();
    } catch {
      setErrors({ message: "WhatsApp disconnection failed." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <MessageCircle className="size-4.5 text-emerald" />
            WhatsApp Connection
          </span>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {isConnected && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Webhook status</p>
              <Badge variant={account?.webhookSubscribed ? "default" : "destructive"} className="gap-1">
                {account?.webhookSubscribed ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {account?.webhookSubscribed
                  ? "Subscribed — messages will reach the chatbot"
                  : "Not subscribed — incoming messages won't reach the chatbot. Try Update Connection."}
              </Badge>
              {!account?.webhookSubscribed && account?.webhookLastErrorMessage && (
                <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Meta Error{account.webhookLastErrorCode ? ` (${account.webhookLastErrorCode})` : ""}:{" "}
                  {account.webhookLastErrorMessage}
                </p>
              )}
            </div>
          )}
          {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          {saved && <p className="text-sm text-emerald">WhatsApp connection saved.</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <FloatingLabelInput
              id="whatsapp-phone-number"
              label="Business Phone Number"
              value={form.phoneNumber}
              onChange={(event) => updateField("phoneNumber", event.target.value)}
              required
            />
            <FloatingLabelInput
              id="whatsapp-meta-phone-number-id"
              label="Meta Phone Number ID"
              value={form.metaPhoneNumberId}
              onChange={(event) => updateField("metaPhoneNumberId", event.target.value)}
              required
            />
            <FloatingLabelInput
              id="whatsapp-meta-business-account-id"
              label="Meta Business Account ID"
              value={form.metaBusinessAccountId}
              onChange={(event) => updateField("metaBusinessAccountId", event.target.value)}
              required
            />
            <FloatingLabelInput
              id="whatsapp-display-name"
              label="Display Name (optional)"
              value={form.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
            />
          </div>
        </CardContent>
        <div className="flex items-center justify-end gap-2 border-t px-(--card-spacing) pt-4">
          {account && (
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
