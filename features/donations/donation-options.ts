export const DONATION_PURPOSE_PRESETS = [
  "General Donation",
  "Annadanam (Food Offering)",
  "Seva",
  "Festival Sponsorship",
  "Temple Maintenance",
  "Archana",
  "Abhishekam",
  "Construction / Renovation",
  "Vastra / Alankaram",
] as const;

export const DONATION_PURPOSE_OTHER = "Other" as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;
