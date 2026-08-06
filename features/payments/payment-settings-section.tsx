"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TenantPaymentAccount } from "@/types/db";
import { cn } from "@/lib/utils";
import { RazorpayConnectionCard } from "./razorpay-connection-card";
import { PhonePeConnectionCard } from "./phonepe-connection-card";

interface PaymentSettingsSectionProps {
  account: TenantPaymentAccount | null;
}

type ProviderChoice = "razorpay" | "phonepe";

/**
 * Provider picker + whichever provider's connection card is relevant.
 * Deliberately not driven by the `payment_providers` catalog table (which
 * also carries "coming soon" rows for stripe/cashfree/payu) — only the two
 * providers this app actually implements an adapter for are offered here.
 * Once connected, the connected provider's own card is shown regardless of
 * the radio selection (mirrors the single-active-account model:
 * tenant_payment_accounts allows only one `is_active` row per tenant).
 */
export function PaymentSettingsSection({ account }: PaymentSettingsSectionProps) {
  const t = useTranslations("paymentSettings.providerSelector");
  const isConnected = account !== null && account.status === "connected";
  const [choice, setChoice] = useState<ProviderChoice>(isConnected ? (account.providerKey as ProviderChoice) : "razorpay");

  const activeChoice: ProviderChoice = isConnected ? (account.providerKey as ProviderChoice) : choice;

  return (
    <div className="space-y-4">
      {!isConnected && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
          <div className="flex gap-2">
            {(["razorpay", "phonepe"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setChoice(provider)}
                className={cn(
                  "flex-1 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeChoice === provider
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-muted",
                )}
              >
                {t(provider)}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeChoice === "razorpay" ? (
        <RazorpayConnectionCard account={account} />
      ) : (
        <PhonePeConnectionCard account={account} />
      )}
    </div>
  );
}
