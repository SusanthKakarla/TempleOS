"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, QrCode, Upload, X } from "lucide-react";
import type { TenantPaymentAccount } from "@/types/db";
import { manualConnectUpiSchema } from "@/lib/validation/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Label } from "@/components/ui/label";

interface UpiConnectionCardProps {
  account: TenantPaymentAccount | null;
}

/**
 * V0 UPI setup — a plain form, not an OAuth/API-key connect flow, since
 * there's no gateway involved: the temple's own VPA/payee name/QR are the
 * only inputs the public donation page needs to build a standard
 * `upi://pay` link. Mirrors RazorpayConnectionCard/PhonePeConnectionCard's
 * card shape (status badge, fields grid once connected) but the "connect"
 * state is an inline form rather than a dialog, since there's no
 * credential-sensitive reason to hide it behind one.
 */
export function UpiConnectionCard({ account }: UpiConnectionCardProps) {
  const router = useRouter();
  const t = useTranslations("paymentSettings.upi");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConnected = account !== null && account.status === "connected" && account.providerKey === "upi_manual";

  const [upiVpa, setUpiVpa] = useState(account?.upiVpa ?? "");
  const [payeeName, setPayeeName] = useState(account?.payeeName ?? "");
  const [bankLabel, setBankLabel] = useState(account?.bankLabel ?? "");
  const [defaultDonationNote, setDefaultDonationNote] = useState(account?.defaultDonationNote ?? "");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(account?.qrCodeUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  async function handleQrSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/payments/accounts/upi/qr", { method: "POST", body: formData });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? t("qrUploadError"));
      setQrCodeUrl(body.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("qrUploadError"));
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleSave() {
    setError(null);
    const parsed = manualConnectUpiSchema.safeParse({
      upiVpa,
      payeeName,
      qrCodeUrl,
      bankLabel: bankLabel.trim() || null,
      defaultDonationNote: defaultDonationNote.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/payments/accounts/upi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? t("saveError"));
      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4.5 text-primary" />
          {t("cardTitle")}
        </CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={isConnected ? "default" : "secondary"} className="w-fit gap-1">
          {isConnected && <CheckCircle2 className="size-3.5" />}
          {isConnected ? t("statusConnected") : t("statusNotConnected")}
        </Badge>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput
            id="upi-vpa"
            label={t("fields.upiVpa")}
            placeholder={t("fields.upiVpaPlaceholder")}
            value={upiVpa}
            onChange={(e) => setUpiVpa(e.target.value)}
            required
          />
          <LabeledInput
            id="upi-payee-name"
            label={t("fields.payeeName")}
            placeholder={t("fields.payeeNamePlaceholder")}
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            required
          />
          <LabeledInput
            id="upi-bank-label"
            label={t("fields.bankLabel")}
            placeholder={t("fields.bankLabelPlaceholder")}
            value={bankLabel}
            onChange={(e) => setBankLabel(e.target.value)}
          />
          <LabeledInput
            id="upi-default-note"
            label={t("fields.defaultNote")}
            placeholder={t("fields.defaultNotePlaceholder")}
            value={defaultDonationNote}
            onChange={(e) => setDefaultDonationNote(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("fields.qrCode")}</Label>
          {qrCodeUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset */}
              <img src={qrCodeUrl} alt="" className="size-20 rounded-lg border object-cover" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setQrCodeUrl(null)}>
                <X className="size-3.5" />
                {t("qrRemove")}
              </Button>
            </div>
          ) : (
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleQrSelect} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploadingQr}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {uploadingQr ? t("qrUploading") : t("qrUploadLabel")}
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button disabled={saving} onClick={handleSave}>
          {saving ? t("saving") : t("saveButton")}
        </Button>
      </CardContent>
    </Card>
  );
}
