import { getPool } from "./pool";

export interface CampaignDeliverySummary {
  recipients: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  retrying: number;
}

/** Every number here is a live aggregate over `notifications WHERE campaign_id = X` — never a stored counter that can drift. */
export async function getCampaignDeliverySummary(tenantId: string, campaignId: string): Promise<CampaignDeliverySummary> {
  const { rows } = await getPool().query<{ delivery_status: string; count: string }>(
    `SELECT delivery_status, count(*) AS count FROM notifications
     WHERE tenant_id = $1 AND campaign_id = $2
     GROUP BY delivery_status`,
    [tenantId, campaignId],
  );

  const summary: CampaignDeliverySummary = { recipients: 0, queued: 0, sent: 0, delivered: 0, failed: 0, retrying: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    summary.recipients += count;
    switch (row.delivery_status) {
      case "sent":
        summary.sent += count;
        break;
      case "delivered":
        summary.sent += count;
        summary.delivered += count;
        break;
      case "failed":
        summary.failed += count;
        break;
      case "retrying":
        summary.retrying += count;
        summary.queued += count;
        break;
      default:
        summary.queued += count; // pending, queued
    }
  }
  return summary;
}

export interface CampaignDonationSummary {
  totalAmount: number;
  donationCount: number;
  donorCount: number;
}

/**
 * Fundraising rollup for a donation-type campaign — a live query against the
 * existing donations table, matched by purpose tag. Never a stored "raised"
 * counter. Donor count treats every manual/anonymous donation (devotee_id
 * IS NULL — e.g. public Razorpay checkout donations) as its own distinct
 * donor via COALESCE onto the donation's own id, since count(DISTINCT
 * devotee_id) alone silently excludes every NULL and would undercount (or
 * zero out) campaigns funded primarily through the public donation link.
 */
export async function getCampaignDonationSummary(tenantId: string, purpose: string): Promise<CampaignDonationSummary> {
  const { rows } = await getPool().query<{ total: string; count: string; donors: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total, count(*) AS count,
            count(DISTINCT COALESCE(devotee_id::text, id::text)) AS donors
     FROM donations
     WHERE tenant_id = $1 AND purpose = $2`,
    [tenantId, purpose],
  );
  return {
    totalAmount: Number(rows[0]?.total ?? 0),
    donationCount: Number(rows[0]?.count ?? 0),
    donorCount: Number(rows[0]?.donors ?? 0),
  };
}

/**
 * Donations recorded against this campaign's purpose tag, most recent first
 * — reuses the existing donations table directly, no campaign-specific
 * donation storage. LEFT JOINs devotees (not INNER) so manual/anonymous
 * donations (devotee_id IS NULL — e.g. public Razorpay checkout) still
 * appear here instead of being silently dropped, which previously
 * contradicted the non-zero totals shown by getCampaignDonationSummary
 * above on the same page.
 */
export async function listCampaignDonations(tenantId: string, purpose: string, limit = 20) {
  const { rows } = await getPool().query<{
    id: string;
    devotee_id: string | null;
    donor_name: string;
    amount: string | null;
    payment_method: string | null;
    item_description: string | null;
    donated_at: Date;
  }>(
    `SELECT d.id, d.devotee_id, COALESCE(dv.display_name, d.manual_donor_name) AS donor_name,
            d.amount, d.payment_method, d.item_description, d.donated_at
     FROM donations d
     LEFT JOIN devotees dv ON dv.id = d.devotee_id
     WHERE d.tenant_id = $1 AND d.purpose = $2
     ORDER BY d.donated_at DESC
     LIMIT $3`,
    [tenantId, purpose, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    devoteeId: row.devotee_id,
    donorName: row.donor_name,
    amount: row.amount,
    paymentMethod: row.payment_method,
    itemDescription: row.item_description,
    donatedAt: row.donated_at.toISOString(),
  }));
}
