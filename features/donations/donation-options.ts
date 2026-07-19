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

/** Maps each stored (English, DB-value) preset to its translation-key slug in `donations.purposePresets.*`. */
export const DONATION_PURPOSE_PRESET_KEYS: Record<(typeof DONATION_PURPOSE_PRESETS)[number], string> = {
  "General Donation": "generalDonation",
  "Annadanam (Food Offering)": "annadanam",
  Seva: "seva",
  "Festival Sponsorship": "festivalSponsorship",
  "Temple Maintenance": "templeMaintenance",
  Archana: "archana",
  Abhishekam: "abhishekam",
  "Construction / Renovation": "constructionRenovation",
  "Vastra / Alankaram": "vastraAlankaram",
};

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;
