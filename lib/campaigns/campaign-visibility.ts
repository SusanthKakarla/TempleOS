import { toCalendarDate, todayInTimeZone } from "@/lib/date";
import type { Campaign } from "@/types/db";

/**
 * Why a campaign that genuinely exists (real tenant, real campaign, correct
 * token) still can't accept donations right now. Deliberately excludes
 * "not_found" — that is an *identity* verdict decided before this runs, and
 * conflating the two is what makes anti-enumeration leak.
 */
export type CampaignWindowBlock = "not_started" | "expired" | "disabled";

/**
 * Statuses that stop a campaign accepting payment. The page itself still
 * renders — the caller turns this into a `blockedReason` banner, not a dead
 * end.
 *
 * `paused` is included because an admin pausing a campaign is exactly the
 * "manually disabled" case. `completed` is NOT: in this schema `status`
 * tracks the WhatsApp *broadcast* lifecycle, not the fundraiser (see
 * lib/campaigns/run-campaign.ts — a one-time donation campaign is
 * deliberately left `running` after its announcement sends). A campaign whose
 * announcement finished going out is routinely still collecting donations for
 * weeks; whether the fundraiser is over is answered by `campaignEndDate`
 * alone. Same for `draft`/`scheduled` — the donation link must work for
 * preview and manual sharing the moment the campaign exists, never gated on a
 * "Send Now" click.
 */
const TERMINAL_STATUSES: ReadonlySet<Campaign["status"]> = new Set(["archived", "cancelled", "paused"]);

export type CampaignWindowFields = Pick<Campaign, "status" | "campaignStartDate" | "campaignEndDate">;

/**
 * The single rule for "should the public see this campaign right now?",
 * shared by the donation page, the checkout API, and their tests.
 *
 * Both bounds are **inclusive calendar days in the temple's own timezone**: a
 * campaign dated 1 Aug – 31 Aug is live from the first moment of the 1st
 * through the last moment of the 31st, local time. This is the whole reason
 * the comparison is done on "yyyy-MM-dd" strings rather than `Date` objects —
 * `new Date("2026-08-31") < new Date()` marks an Indian temple's campaign
 * "ended" at 05:30 on the morning of the 31st, losing the entire final day
 * (and, for a same-day campaign, every hour it was ever supposed to run).
 *
 * Returns null when the campaign is open.
 */
export function evaluateCampaignWindow(
  campaign: CampaignWindowFields,
  timezone: string,
  now: Date = new Date(),
): CampaignWindowBlock | null {
  const today = todayInTimeZone(timezone, now);
  const startDate = toCalendarDate(campaign.campaignStartDate);
  const endDate = toCalendarDate(campaign.campaignEndDate);

  if (startDate && today < startDate) return "not_started";
  if (endDate && today > endDate) return "expired";
  if (TERMINAL_STATUSES.has(campaign.status)) return "disabled";
  return null;
}

/**
 * Whole days remaining, counting the end day itself ("1 day left" throughout
 * the final day, "0" never shown — the caller renders null as "no deadline").
 * Timezone-aware for the same reason as {@link evaluateCampaignWindow}.
 * Returns null when there is no end date or it has already passed.
 */
export function computeDaysLeftInTimeZone(
  endDate: string | null,
  timezone: string,
  now: Date = new Date(),
): number | null {
  const end = toCalendarDate(endDate);
  if (!end) return null;
  const today = todayInTimeZone(timezone, now);
  if (today > end) return null;

  const diffMs = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(diffMs)) return null;
  return Math.round(diffMs / 86_400_000) + 1;
}
