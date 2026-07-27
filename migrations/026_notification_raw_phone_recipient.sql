-- A donation receipt must reach a Razorpay checkout donor by the phone
-- number captured at checkout — they are neither a devotee nor a tenant
-- member/person, so neither existing recipient column applies. Widens the
-- notifications engine (not a payment-specific bolt-on) with a third,
-- mutually-exclusive recipient kind: a raw phone number, with no
-- opt-in/preference gate (they just completed a payment they initiated).

ALTER TABLE notifications ADD COLUMN recipient_phone TEXT;

ALTER TABLE notifications DROP CONSTRAINT notifications_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_check
  CHECK (num_nonnulls(recipient_person_id, recipient_devotee_id, recipient_phone) = 1);
