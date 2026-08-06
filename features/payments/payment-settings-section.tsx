"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PaymentProvider, PaymentProviderKey, TenantPaymentAccount } from "@/types/db";
import { cn } from "@/lib/utils";
import { RazorpayConnectionCard } from "./razorpay-connection-card";
import { PhonePeConnectionCard } from "./phonepe-connection-card";
import { UpiConnectionCard } from "./upi-connection-card";

interface PaymentSettingsSectionProps {
  account: TenantPaymentAccount | null;
  /** The platform-wide provider catalog — only providers with `status === "active"` get a picker button. Razorpay/PhonePe are toggled to `coming_soon` for V0 (migrations/039), so only UPI shows up until that's reverted for V1. */
  providers: PaymentProvider[];
}

type ProviderChoice = "razorpay" | "phonepe" | "upi_manual";

const ALL_CHOICES: ProviderChoice[] = ["upi_manual", "razorpay", "phonepe"];

/**
 * Provider picker + whichever provider's connection card is relevant. Picker
 * buttons are now data-driven off the `payment_providers` catalog (only
 * `status === "active"` rows render a button) instead of a hardcoded pair —
 * this is what lets the platform-wide V0 gateway disable (see
 * migrations/039_upi_manual_provider.sql) actually hide Razorpay/PhonePe
 * here with zero further UI changes, and bring them back with zero changes
 * too once their catalog status flips back to `active`. Once connected, the
 * connected provider's own card is shown regardless of the radio selection
 * (mirrors the single-active-account model: tenant_payment_accounts allows
 * only one `is_active` row per tenant).
 */
export function PaymentSettingsSection({ account, providers }: PaymentSettingsSectionProps) {
  const t = useTranslations("paymentSettings.providerSelector");
  const isConnected = account !== null && account.status === "connected";
  const activeProviderKeys = new Set(providers.filter((p) => p.status === "active").map((p) => p.key));
  const availableChoices = ALL_CHOICES.filter((choice) => activeProviderKeys.has(choice as PaymentProviderKey));
  const defaultChoice = availableChoices[0] ?? "upi_manual";
  const [choice, setChoice] = useState<ProviderChoice>(isConnected ? (account.providerKey as ProviderChoice) : defaultChoice);

  const activeChoice: ProviderChoice = isConnected ? (account.providerKey as ProviderChoice) : choice;

  return (
    <div className="space-y-4">
      {!isConnected && availableChoices.length > 1 && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
          <div className="flex gap-2">
            {availableChoices.map((provider) => (
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
      ) : activeChoice === "phonepe" ? (
        <PhonePeConnectionCard account={account} />
      ) : (
        <UpiConnectionCard account={account} />
      )}
    </div>
  );
}
