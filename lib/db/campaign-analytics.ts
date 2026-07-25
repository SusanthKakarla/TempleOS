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

/** Fundraising rollup for a donation-type campaign — a live query against the existing donations table, matched by purpose tag. Never a stored "raised" counter. */
export async function getCampaignDonationSummary(tenantId: string, purpose: string): Promise<CampaignDonationSummary> {
  const { rows } = await getPool().query<{ total: string; count: string; donors: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total, count(*) AS count, count(DISTINCT devotee_id) AS donors
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

/** Donations recorded against this campaign's purpose tag, most recent first — reuses the existing donations table directly, no campaign-specific donation storage. */
export async function listCampaignDonations(tenantId: string, purpose: string, limit = 20) {
  const { rows } = await getPool().query<{
    id: string;
    devotee_id: string;
    donor_name: string;
    amount: string;
    payment_method: string;
    donated_at: Date;
  }>(
    `SELECT d.id, d.devotee_id, dv.display_name AS donor_name, d.amount, d.payment_method, d.donated_at
     FROM donations d
     JOIN devotees dv ON dv.id = d.devotee_id
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
    donatedAt: row.donated_at.toISOString(),
  }));
}
