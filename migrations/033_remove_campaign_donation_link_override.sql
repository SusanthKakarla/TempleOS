-- Removed: campaigns.donation_link_override predates the real Razorpay
-- checkout (buildDonationLink already generates a working
-- {base}/{tenantSlug}/{campaignSlug}/{donationToken} link for every
-- campaign) and only ever served as a placeholder-era escape hatch to an
-- external URL. Keeping it risked an admin accidentally pointing a campaign
-- away from the real, working checkout.
ALTER TABLE campaigns DROP COLUMN donation_link_override;
