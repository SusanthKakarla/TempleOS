import { getTranslations } from "next-intl/server";
import { translateMany } from "@/lib/i18n/translate";
import { DONATION_PURPOSE_PRESET_KEYS } from "@/features/donations/donation-options";
import type { Donation, SupportedLanguage } from "@/types/db";

/** System-generated fallback for an online donation with no linked campaign (lib/payments/campaign-payment-service.ts) — a fixed sentinel, not admin-typed free text, so it gets a translation key rather than being run through machine translation. */
const SYSTEM_PURPOSE_KEYS: Record<string, string> = { online_donation: "onlineDonation" };

/**
 * donations.purpose is a hybrid: one of 9 fixed presets or "Other" (both
 * already dictionary-translated, see donation-form-dialog.tsx's identical
 * purposeLabel logic), the online-donation system sentinel above, or
 * genuinely free text (a manually-typed "Other" purpose, or a campaign's
 * own admin-typed linkedDonationPurpose) — only that last category needs
 * live machine translation. Shared by the donations dashboard page and its
 * export routes so both resolve `purpose` identically.
 */
export async function resolveDonationPurposes<T extends Donation>(donations: T[], locale: SupportedLanguage): Promise<T[]> {
  const tPurpose = await getTranslations("donations.purposePresets");
  const presetKeys = { ...DONATION_PURPOSE_PRESET_KEYS, ...SYSTEM_PURPOSE_KEYS } as Record<string, string>;

  const customTexts = [...new Set(donations.map((d) => d.purpose).filter((purpose) => !presetKeys[purpose]))];
  const translatedCustom = locale === "te" && customTexts.length > 0 ? await translateMany(customTexts) : customTexts;
  const customByOriginal = new Map(customTexts.map((text, i) => [text, translatedCustom[i]] as const));

  return donations.map((donation) => {
    const key = presetKeys[donation.purpose];
    const purpose = key ? tPurpose(key) : (customByOriginal.get(donation.purpose) ?? donation.purpose);
    return { ...donation, purpose };
  });
}
