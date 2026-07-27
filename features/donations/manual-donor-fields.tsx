"use client";

import { useTranslations } from "next-intl";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LabeledInput } from "@/components/ui/labeled-input";

export interface ManualDonorValue {
  name: string;
  phone: string;
  email: string;
  address: string;
  isAnonymous: boolean;
}

export const BLANK_MANUAL_DONOR: ManualDonorValue = {
  name: "",
  phone: "",
  email: "",
  address: "",
  isAnonymous: false,
};

interface ManualDonorFieldsProps {
  value: ManualDonorValue;
  onChange: (value: ManualDonorValue) => void;
  requiredLabel?: string;
}

/**
 * Donor details for a donation with no registered devotee (walk-ins,
 * visitors, anonymous/corporate/NRI donors) — a lightweight alternative to
 * the devotee picker, not a devotee-creation form. Reusable anywhere a
 * donation (or a future module) needs to record a non-registered party.
 */
export function ManualDonorFields({ value, onChange, requiredLabel }: ManualDonorFieldsProps) {
  const t = useTranslations("donations.formDialog.manualDonor");

  function patch(update: Partial<ManualDonorValue>) {
    onChange({ ...value, ...update });
  }

  return (
    <div className="space-y-4">
      <LabeledInput
        id="manual-donor-name"
        label={t("name")}
        icon={<User />}
        value={value.name}
        onChange={(e) => patch({ name: e.target.value })}
        required
        requiredLabel={requiredLabel}
        inputSize="lg"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LabeledInput
          id="manual-donor-phone"
          label={t("phone")}
          icon={<Phone />}
          value={value.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder={t("phonePlaceholder")}
          inputSize="lg"
        />
        <LabeledInput
          id="manual-donor-email"
          label={t("email")}
          icon={<Mail />}
          type="email"
          value={value.email}
          onChange={(e) => patch({ email: e.target.value })}
          inputSize="lg"
        />
      </div>
      <LabeledInput
        id="manual-donor-address"
        label={t("address")}
        icon={<MapPin />}
        value={value.address}
        onChange={(e) => patch({ address: e.target.value })}
        inputSize="lg"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value.isAnonymous}
          onCheckedChange={(checked) => patch({ isAnonymous: checked === true })}
        />
        {t("anonymous")}
      </label>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
