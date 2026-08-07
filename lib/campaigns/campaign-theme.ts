/**
 * The one place that decides how a donation campaign looks and what story it
 * tells. Every visual difference between a Renovation page and an Annadanam
 * page comes from this table — components read a resolved theme and render
 * it, so a new category is a registry entry, never a component change.
 *
 * There is deliberately no `campaigns.category` column: the category is
 * derived from the campaign's own `linkedDonationPurpose` (a free-text field
 * in the campaign form — real data holds "Renovation", "prasadam",
 * "Annadanam (Food Offering)"), falling back to the title. That means every
 * campaign that already exists gets a theme with no migration and no admin
 * re-entry, and a temple that types something unexpected still lands on a
 * dignified general theme rather than a broken page.
 */

export const CAMPAIGN_CATEGORIES = [
  "renovation",
  "annadanam",
  "goseva",
  "festival",
  "seva",
  "education",
  "medical",
  "general",
] as const;

export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number];

/** Lucide icon name, resolved to a component by the client via CAMPAIGN_THEME_ICONS — the registry itself stays a plain serializable object so it can cross the server/client boundary. */
export type CampaignThemeIcon =
  | "Building2"
  | "UtensilsCrossed"
  | "Sprout"
  | "Sparkles"
  | "Flame"
  | "GraduationCap"
  | "Stethoscope"
  | "HandHeart";

export interface CampaignTheme {
  category: CampaignCategory;
  /** Badge text over the hero. */
  label: string;
  icon: CampaignThemeIcon;
  /** Tailwind gradient classes for the hero scrim + accent surfaces — the main per-category visual signal. */
  gradient: string;
  /** Hex accent used for icon chips, progress fill, and focus rings on this campaign's page. */
  accent: string;
  /**
   * Hero artwork used when the temple hasn't uploaded its own banner.
   *
   * All categories currently point at the shared temple photograph: shipping
   * per-category stock photography is a licensing decision, not a code one,
   * so the registry declares the slot and the resolution order instead of
   * inventing imagery. Drop a licensed image at the path below and change
   * this one line to give a category its own art — nothing else moves.
   */
  heroImage: string;
  /** "Your contribution helps" — 3-4 concrete, category-specific outcomes. Replaces the identical hardcoded list every campaign used to show. */
  impactPoints: string[];
}

const DEFAULT_HERO_IMAGE = "/donate-hero-temple.png";

export const CAMPAIGN_THEMES: Record<CampaignCategory, CampaignTheme> = {
  renovation: {
    category: "renovation",
    label: "Temple Renovation",
    icon: "Building2",
    gradient: "from-[#8B5A2B] to-[#D4AF37]",
    accent: "#B87333",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Restore and strengthen the temple structure",
      "Preserve stone carvings and sacred architecture",
      "Improve facilities for visiting devotees",
      "Protect the heritage for future generations",
    ],
  },
  annadanam: {
    category: "annadanam",
    label: "Annadanam",
    icon: "UtensilsCrossed",
    gradient: "from-[#C2410C] to-[#F59E0B]",
    accent: "#D97706",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Serve free meals to devotees and the needy",
      "Sponsor prasadam on festival days",
      "Keep the temple kitchen running daily",
      "Feed those who arrive with nothing",
    ],
  },
  goseva: {
    category: "goseva",
    label: "Go Seva",
    icon: "Sprout",
    gradient: "from-[#166534] to-[#84CC16]",
    accent: "#4D7C0F",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Fodder and care for the temple's cows",
      "Shelter and veterinary treatment at the goshala",
      "Support the volunteers who tend them daily",
    ],
  },
  festival: {
    category: "festival",
    label: "Festival Seva",
    icon: "Sparkles",
    gradient: "from-[#9D174D] to-[#F59E0B]",
    accent: "#BE185D",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Flowers, decorations, and temple lighting",
      "Deepam and processions through the streets",
      "Prasadam for everyone who attends",
      "Bring the whole community together",
    ],
  },
  seva: {
    category: "seva",
    label: "Daily Seva",
    icon: "Flame",
    gradient: "from-[#7C2D12] to-[#EAB308]",
    accent: "#D4AF37",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Daily archana, abhishekam, and deepa aradhana",
      "Vastra and alankaram for the deity",
      "Support the priests who never pause the rituals",
    ],
  },
  education: {
    category: "education",
    label: "Veda Patashala",
    icon: "GraduationCap",
    gradient: "from-[#1E3A8A] to-[#38BDF8]",
    accent: "#1D4ED8",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Teach the Vedas to the next generation",
      "Books and materials for students",
      "Meals and lodging for resident learners",
    ],
  },
  medical: {
    category: "medical",
    label: "Medical Seva",
    icon: "Stethoscope",
    gradient: "from-[#065F46] to-[#2DD4BF]",
    accent: "#0D9488",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Free health camps for the surrounding villages",
      "Medicines for those who cannot afford them",
      "Doctors and volunteers on the ground",
    ],
  },
  general: {
    category: "general",
    label: "Temple Donation",
    icon: "HandHeart",
    gradient: "from-[#7C2D12] to-[#D4AF37]",
    accent: "#D4AF37",
    heroImage: DEFAULT_HERO_IMAGE,
    impactPoints: [
      "Daily poojas and rituals",
      "Upkeep of the temple and its grounds",
      "Annadanam and community service",
      "Festivals that keep the traditions alive",
    ],
  },
};

/**
 * Keyword → category, checked in order. First match wins, so more specific
 * phrases must precede the words they contain ("cow shelter" before "shelter",
 * "temple maintenance" before "temple"). Every one of the nine purpose
 * presets the dashboard offers is covered, alongside the free text temples
 * actually type.
 */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [CampaignCategory, readonly string[]]> = [
  ["annadanam", ["annadanam", "anna danam", "prasadam", "prasad", "food", "meal", "bhojan", "kitchen"]],
  ["goseva", ["go seva", "goseva", "gau seva", "gaushala", "goshala", "cow", "cattle"]],
  ["education", ["patashala", "pathshala", "veda", "school", "education", "student", "vidya", "book"]],
  ["medical", ["medical", "health", "hospital", "doctor", "clinic", "ambulance", "camp"]],
  ["festival", ["festival", "utsav", "utsavam", "brahmotsav", "jayanti", "navratri", "deepavali", "diwali", "sankranti", "decoration"]],
  ["renovation", ["renovation", "renovate", "construction", "construct", "rebuild", "restore", "restoration", "maintenance", "repair", "gopuram", "building", "infrastructure"]],
  ["seva", ["seva", "archana", "abhishekam", "abhisheka", "alankaram", "vastra", "pooja", "puja", "deepam", "nitya", "daily"]],
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Resolves a campaign's category from its donation purpose, falling back to
 * the campaign title (a temple that leaves the purpose generic often still
 * names the campaign "Gopuram Renovation"), then to `general`.
 */
export function resolveCampaignCategory(
  linkedDonationPurpose: string | null | undefined,
  title?: string | null,
): CampaignCategory {
  for (const source of [linkedDonationPurpose, title]) {
    if (!source) continue;
    const haystack = normalize(source);
    for (const [category, keywords] of CATEGORY_KEYWORDS) {
      if (keywords.some((keyword) => haystack.includes(keyword))) return category;
    }
  }
  return "general";
}

/** The theme for a campaign — the single entry point components use. */
export function resolveCampaignTheme(
  linkedDonationPurpose: string | null | undefined,
  title?: string | null,
): CampaignTheme {
  return CAMPAIGN_THEMES[resolveCampaignCategory(linkedDonationPurpose, title)];
}

/**
 * Hero artwork resolution, in the order the brief requires: the temple's own
 * uploaded banner always wins, otherwise the category's image, which is
 * never empty. Kept here rather than in the hero component so the OG/WhatsApp
 * preview image resolves through exactly the same rule.
 */
export function resolveCampaignHeroImage(bannerUrl: string | null | undefined, theme: CampaignTheme): string {
  return bannerUrl?.trim() || theme.heroImage;
}
