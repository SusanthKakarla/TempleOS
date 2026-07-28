-- Optional donor-supplied PAN (for 80G-style tax receipts) and a free-text
-- donation message, captured on the public donation form. payment_transactions
-- is the only row that bridges checkout-time (when the donor types these) and
-- webhook-time (when the donation/receipt are actually created), so that's
-- where they're carried — donations.notes stays system-populated as before,
-- with these folded in at capture time rather than given their own column there.
ALTER TABLE payment_transactions ADD COLUMN donor_pan TEXT;
ALTER TABLE payment_transactions ADD COLUMN donor_message TEXT;
