export interface Tenant {
  id: string;
  name: string;
  defaultContactPhone: string | null;
  address: string | null;
  timezone: string;
  // WhatsApp chatbot CMS content (see lib/whatsapp/templates.ts) — every
  // field is nullable since existing tenants predate this and the admin
  // fills them in via the Chatbot Settings page.
  welcomeMessage: string | null;
  description: string | null;
  history: string | null;
  contactEmail: string | null;
  googleMapsLink: string | null;
  morningOpen: string | null; // "HH:MM:SS", as returned by pg for TIME columns
  morningClose: string | null;
  eveningOpen: string | null;
  eveningClose: string | null;
  donationInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = "super_admin" | "admin";

export interface AdminUser {
  id: string;
  tenantId: string;
  phoneNumber: string;
  displayName: string;
  role: AdminRole;
  firebaseUid: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppAccountStatus = "connected" | "disconnected";

export interface WhatsAppAccount {
  id: string;
  tenantId: string;
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  status: WhatsAppAccountStatus;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** WhatsApp chatbot UI language. Only the bot's own chrome is localized —
 * admin-authored CMS content is never machine-translated (see migrations/006_language_support.sql). */
export type SupportedLanguage = "en" | "te";

export type EventStatus = "draft" | "published";

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Devotee {
  id: string;
  tenantId: string;
  whatsappPhone: string;
  displayName: string;
  dateOfBirth: string | null;
  birthStar: string | null;
  ancestralLineage: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastInteractionType: string | null;
  whatsappOptInStatus: boolean;
  // Set only via the WhatsApp bot's language picker (see app/api/whatsapp/webhook/route.ts) —
  // not editable from the admin dashboard's devotee form.
  preferredLanguage: SupportedLanguage | null;
  // Cached from donations (see lib/db/donations.ts), not purely derived.
  // isDonor/totalDonatedAmount/lastDonationAt are recomputed from the
  // donations table on every donation write, never patched incrementally.
  isDonor: boolean;
  totalDonatedAmount: string; // NUMERIC comes back from pg as a string to avoid float precision loss on money
  lastDonationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "received";

export interface WhatsAppMessage {
  id: string;
  tenantId: string;
  devoteeId: string | null;
  direction: MessageDirection;
  fromPhone: string;
  toPhone: string;
  body: string;
  providerMessageId: string | null;
  status: MessageStatus;
  receivedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type InteractionType =
  | "menu"
  | "viewed_events"
  | "requested_contact"
  | "unknown"
  | "viewed_timings"
  | "viewed_history"
  | "viewed_sevas"
  | "viewed_faq"
  | "selected_language"
  | "requested_language_change"
  | "viewed_donation_info"
  | "viewed_help";

export interface WhatsAppInteraction {
  id: string;
  tenantId: string;
  devoteeId: string | null;
  interactionType: InteractionType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "other";

export interface Donation {
  id: string;
  tenantId: string;
  devoteeId: string;
  amount: string; // NUMERIC comes back from pg as a string to avoid float precision loss on money
  purpose: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  donatedAt: string;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** listDonations() joins devotees so the table doesn't need N+1 lookups. */
export interface DonationWithDonor extends Donation {
  donorName: string;
  donorPhone: string;
}

export interface DonationSummary {
  totalAllTime: string;
  totalThisMonth: string;
  donorCount: number;
  donationCount: number;
}

export interface TempleSpecialDay {
  id: string;
  tenantId: string;
  date: string; // "YYYY-MM-DD"
  occasion: string;
  isClosed: boolean;
  morningOpen: string | null;
  morningClose: string | null;
  eveningOpen: string | null;
  eveningClose: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TempleSeva {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: string | null; // NUMERIC comes back from pg as a string to avoid float precision loss on money
  duration: string | null;
  availableDays: DayOfWeek[];
  bookingEnabled: boolean; // reserved for a future booking milestone; not acted on yet
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TempleFaq {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type SocialPlatform = "facebook" | "instagram" | "youtube" | "twitter" | "website" | "other";

export interface TempleSocialLink {
  id: string;
  tenantId: string;
  platform: SocialPlatform;
  url: string;
  createdAt: string;
  updatedAt: string;
}
