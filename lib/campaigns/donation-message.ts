import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { Campaign, SupportedLanguage, Tenant } from "@/types/db";

const DEFAULT_DONATION_LINK_BASE_URL = "https://demo.trytempleos.com/donate";

const DEFAULT_DESCRIPTION: Record<SupportedLanguage, string> = {
  en: "Join us in supporting this sacred cause.",
  te: "ఈ పవిత్ర కార్యక్రమంలో మాతో చేరండి.",
};

const DEFAULT_BLESSING_MESSAGE: Record<SupportedLanguage, string> = {
  en: "🙏 Thank you for supporting our temple.",
  te: "🙏 మా దేవాలయానికి మద్దతు ఇచ్చినందుకు ధన్యవాదాలు.",
};

type DonationCampaignFields = Pick<
  Campaign,
  | "id"
  | "title"
  | "description"
  | "customMessage"
  | "goalAmount"
  | "campaignStartDate"
  | "campaignEndDate"
  | "donationLinkOverride"
  | "linkedDonationPurpose"
>;

/**
 * `campaign.donationLinkOverride` wins if set; otherwise a base URL read from
 * config (never hardcoded — swappable for a real payment gateway later
 * without touching any notification logic), defaulting to a demo endpoint
 * for the current testing phase.
 */
export function buildDonationLink(campaign: Pick<Campaign, "id" | "donationLinkOverride">): string {
  if (campaign.donationLinkOverride) return campaign.donationLinkOverride;
  const base = process.env.DONATION_LINK_BASE_URL?.trim() || DEFAULT_DONATION_LINK_BASE_URL;
  return `${base.replace(/\/+$/, "")}/${campaign.id}`;
}

/** Uncapped — a campaign can exceed 100% of its goal; callers decide how to display that (see raisedPercentage below, which IS capped for the template). */
export function computeRaisedPercentage(raisedAmount: number, goalAmount: number): number {
  if (!(goalAmount > 0)) return 0;
  return (raisedAmount / goalAmount) * 100;
}

/**
 * True only when every donation-campaign field the rich template needs is
 * actually present — deliberately does NOT fall back to an empty string for
 * a missing start/end date the way a simpler implementation might.
 * template-variable-resolver.ts treats an empty resolved variable as
 * "missing" and send-notification.ts classifies that as a PERMANENT
 * failure (no retry) — this is the same eventLocationLine trap
 * lib/whatsapp/standard-template-catalog.ts already had to design around
 * for event templates. Safer to fall back to the generic campaign_broadcast
 * path (existing behavior, unaffected) than to ever risk sending an empty
 * required variable to Meta.
 */
export function isDonationCampaignReady(campaign: DonationCampaignFields): boolean {
  return (
    campaign.goalAmount != null &&
    Number(campaign.goalAmount) > 0 &&
    campaign.campaignStartDate != null &&
    campaign.campaignEndDate != null &&
    // Without a linked purpose, getCampaignDonationSummary has nothing to
    // aggregate and "raised" would always read as zero — misleading rather
    // than merely incomplete, so this path requires it.
    campaign.linkedDonationPurpose != null
  );
}

export interface DonationCampaignVarsResult {
  vars: Record<string, string>;
  goalReached: boolean;
  /** Uncapped percentage, for the UI progress bar (which can show >100%); the `vars.raisedPercentage` string is capped at 100 for the template body. */
  rawPercentage: number;
}

/**
 * The single place that builds every variable the donation_campaign_broadcast
 * template (Meta HSM and free-form alike) needs, so the "Send" path and the
 * preview endpoint can never drift from each other. Caller must have already
 * checked isDonationCampaignReady() — this function does not re-check and
 * will happily render empty date strings if called without that guarantee.
 */
export function buildDonationCampaignVars(
  tenant: Pick<Tenant, "name">,
  campaign: DonationCampaignFields,
  donationSummary: { totalAmount: number },
  language: SupportedLanguage,
): DonationCampaignVarsResult {
  const goal = Number(campaign.goalAmount ?? 0);
  const raised = donationSummary.totalAmount;
  const rawPercentage = computeRaisedPercentage(raised, goal);
  const goalReached = goal > 0 && raised >= goal;

  const vars: Record<string, string> = {
    templeName: tenant.name,
    campaignTitle: campaign.title,
    campaignDescription: campaign.description?.trim() || DEFAULT_DESCRIPTION[language],
    goalAmount: formatInr(goal),
    raisedAmount: formatInr(raised),
    raisedPercentage: String(Math.min(100, Math.round(rawPercentage))),
    startDate: campaign.campaignStartDate ? formatDate(campaign.campaignStartDate, language) : "",
    endDate: campaign.campaignEndDate ? formatDate(campaign.campaignEndDate, language) : "",
    donationLink: buildDonationLink(campaign),
    blessingMessage: campaign.customMessage?.trim() || DEFAULT_BLESSING_MESSAGE[language],
  };

  return { vars, goalReached, rawPercentage };
}
