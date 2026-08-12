export const TENANT_STATUSES = ["active", "suspended", "maintenance", "archived", "disabled"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
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
  // Admin toggles for the automatic WhatsApp event notification system (see
  // migrations/007_event_notifications.sql) — independent per notification type.
  notifyOnNewEvent: boolean;
  notifyOnEventUpdated: boolean;
  notifyOnEventCancelled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorType: "super_admin" | "tenant_member" | "system";
  actorId: string;
  tenantId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * The catalog is plain TEXT in the DB (see migrations/015_feature_access.sql),
 * not a CHECK-constrained enum — new modules can be added with one INSERT.
 * This union covers every key the app ships with today, split into the ones
 * enforcement code actually references (real modules) and the rest (bundled
 * sub-capabilities and "coming soon" placeholders), so `requireTenantFeature`
 * call sites get autocomplete/typo-safety without the catalog itself being
 * closed.
 */
export const REAL_FEATURE_KEYS = [
  "dashboard",
  "events",
  "devotees",
  "donations",
  "conversations",
  "notifications",
  "whatsapp_chatbot",
  "user_management",
  "campaigns",
] as const;
export type RealFeatureKey = (typeof REAL_FEATURE_KEYS)[number];

export const BUNDLED_FEATURE_KEYS = ["family_devotees", "export", "import"] as const;
export type BundledFeatureKey = (typeof BUNDLED_FEATURE_KEYS)[number];

export const COMING_SOON_FEATURE_KEYS = [
  "reports",
  "analytics",
  "inventory",
  "prasadam",
  "volunteers",
  "committee",
  "priests",
  "temple_website",
  "qr_donations",
  "online_booking",
  "ai_assistant",
  "language_translation",
  "festival_calendar",
  "crm",
] as const;
export type ComingSoonFeatureKey = (typeof COMING_SOON_FEATURE_KEYS)[number];

export type FeatureKey = RealFeatureKey | BundledFeatureKey | ComingSoonFeatureKey;
export type FeatureCategory = "core" | "module" | "coming_soon";

export interface Feature {
  id: string;
  key: FeatureKey;
  displayName: string;
  description: string | null;
  icon: string | null;
  category: FeatureCategory;
  isCore: boolean;
  defaultEnabled: boolean;
  dependsOn: FeatureKey[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFeature {
  id: string;
  tenantId: string;
  featureKey: FeatureKey;
  enabled: boolean;
  enabledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdmin {
  id: string;
  personId: string;
  phoneNumber: string;
  displayName: string;
  firebaseUid: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  phoneNumber: string;
  displayName: string;
  firebaseUid: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `primary` is the tenant's admin subdomain, `website` its public temple site, `custom` a vanity domain pointed at either. */
export type TenantDomainKind = "primary" | "custom" | "website";
export type TenantDomainStatus = "active" | "inactive";

export const WEBSITE_HERO_TEMPLATES = ["classic", "heritage", "divine", "minimal", "festival", "immersive"] as const;
export type WebsiteHeroTemplate = (typeof WEBSITE_HERO_TEMPLATES)[number];

export const WEBSITE_THEMES = ["saffron", "maroon", "gold", "emerald", "indigo"] as const;
export type WebsiteTheme = (typeof WEBSITE_THEMES)[number];

/**
 * Presentation config for a tenant's public temple website. Deliberately
 * holds no operational data — name, timings, address, contact, sevas, events,
 * social links and gallery all come from the tables the admin portal already
 * writes to, so the website is a read-only view of them.
 */
export interface TenantWebsite {
  id: string;
  tenantId: string;
  enabled: boolean;
  heroTemplate: WebsiteHeroTemplate;
  theme: WebsiteTheme;
  displayName: string | null;
  deityName: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  story: string | null;
  aboutContent: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  deityMediaId: string | null;
  heroMediaId: string | null;
  logoMediaId: string | null;
  ogMediaId: string | null;
  languages: SupportedLanguage[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  hostname: string;
  kind: TenantDomainKind;
  status: TenantDomainStatus;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_CODES = ["admin", "priest", "committee_member", "volunteer", "devotee"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === "string" && (ROLE_CODES as readonly string[]).includes(value);
}

export interface RoleDefinition {
  id: string;
  code: RoleCode;
  displayName: string;
  description: string | null;
  capabilitySet: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TenantMembershipStatus = "active" | "inactive";

export interface TenantMembership {
  id: string;
  tenantId: string;
  personId: string;
  displayName: string;
  status: TenantMembershipStatus;
  preferredUiLanguage: SupportedLanguage | null;
  lastSignedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembershipRole {
  membershipId: string;
  roleDefinitionId: string;
  assignedByMembershipId: string | null;
  assignedAt: string;
}

export type WhatsAppAccountStatus = "connected" | "disconnected";

export interface WhatsAppAccount {
  id: string;
  tenantId: string;
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  // Populated by Embedded Signup's Graph API lookups; null for
  // manually/operator-linked accounts that never made those calls.
  businessName: string | null;
  phoneVerificationStatus: string | null;
  webhookSubscribed: boolean;
  // Set from Meta's Graph API error whenever a subscribe/unsubscribe call
  // fails; cleared to null on the next successful attempt.
  webhookLastErrorCode: string | null;
  webhookLastErrorMessage: string | null;
  status: WhatsAppAccountStatus;
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentProviderKey = "razorpay" | "stripe" | "cashfree" | "phonepe" | "payu" | "upi_manual";
export type PaymentProviderStatus = "active" | "coming_soon";

export interface PaymentProvider {
  key: PaymentProviderKey;
  label: string;
  status: PaymentProviderStatus;
  /** Whether tenants may connect this provider via pasted-in credentials. */
  manualEnabled: boolean;
  /** Whether tenants may connect this provider via Partner/OAuth. False for every provider until real Partner API access exists (e.g. PhonePe today). */
  partnerEnabled: boolean;
  defaultConnectionMethod: PaymentConnectionMethod;
}

export type PaymentAccountStatus = "connected" | "disabled";

/** A tenant's own connected payment account — never the secret material (see PaymentAccountWithCredentials for the one place that needs it). */
export type PaymentConnectionMethod = "manual" | "partner";

export interface TenantPaymentAccount {
  id: string;
  tenantId: string;
  providerKey: PaymentProviderKey;
  connectionMethod: PaymentConnectionMethod;
  /** Partner (OAuth) mode only — the sub-merchant account id Razorpay assigns on connect. */
  razorpayAccountId: string | null;
  /** PhonePe manual mode only — the merchant id sent as X-MERCHANT-ID on API calls. */
  providerMerchantId: string | null;
  /** PhonePe manual mode only — selects the sandbox vs production API host. */
  environment: "sandbox" | "production";
  /** upi_manual only — the temple's own UPI VPA (e.g. "temple@upi"), never a secret. */
  upiVpa: string | null;
  /** upi_manual only — the payee name shown to the UPI app (e.g. "Sri Shiva Temple"). */
  payeeName: string | null;
  /** upi_manual only — the temple's own uploaded static QR image, shown as-is (never a dynamically generated QR). */
  qrCodeUrl: string | null;
  /** upi_manual only — an optional human-readable label like "Temple SBI Account". */
  bankLabel: string | null;
  /** upi_manual only — the default `tn` note used when a donor doesn't supply their own message. */
  defaultDonationNote: string | null;
  status: PaymentAccountStatus;
  isActive: boolean;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentTransactionStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "pending_verification";

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  paymentAccountId: string;
  campaignId: string | null;
  donationId: string | null;
  providerKey: PaymentProviderKey;
  providerOrderId: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorPan: string | null;
  donorMessage: string | null;
  isAnonymous: boolean;
  receiptNumber: string | null;
  receiptUrl: string | null;
  /** upi_manual only — the UPI transaction reference the donor self-reported. */
  upiReference: string | null;
  /** upi_manual only — the donor's uploaded proof-of-payment screenshot. */
  paymentScreenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentWebhookLog {
  id: string;
  tenantId: string | null;
  providerKey: string;
  signatureValid: boolean;
  eventType: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export type PaymentRefundStatus = "pending" | "processed" | "failed";

export interface PaymentRefund {
  id: string;
  tenantId: string;
  transactionId: string;
  providerRefundId: string | null;
  amount: number;
  status: PaymentRefundStatus;
  reason: string | null;
  initiatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReconciliationLog {
  id: string;
  tenantId: string;
  runAt: string;
  transactionsChecked: number;
  mismatchesFound: number;
  autoResolved: number;
  details: unknown[];
  createdAt: string;
}

export type WhatsAppTemplateApprovalStatus = "pending" | "approved" | "rejected" | "disabled";
export type WhatsAppTemplateMetaCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

/**
 * A Meta-approved WhatsApp Message Template registered for one tenant's WABA.
 * Distinct from NotificationTemplate (this app's own free-form message-body
 * copy) — this row only ever gets used when the 24h conversation window is
 * closed and Meta requires a pre-approved template to originate the message.
 */
export interface WhatsAppMessageTemplate {
  id: string;
  tenantId: string;
  templateKey: string;
  metaTemplateName: string;
  language: string;
  metaCategory: WhatsAppTemplateMetaCategory;
  /** Ordered named variables, e.g. ["templeName","userName"] — mapped to Meta's positional {{1}},{{2}}... params in this order. */
  variables: string[];
  approvalStatus: WhatsAppTemplateApprovalStatus;
  enabled: boolean;
  fallbackStrategy: string | null;
  description: string | null;
  /** Copy-paste-ready recommended name/category/body/variable-legend for the admin to submit in Meta Business Manager themselves. Only set by the standard-template bootstrap — null for admin-created rows. */
  submissionGuide: string | null;
  version: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** WhatsApp chatbot UI language. Only the bot's own chrome is localized —
 * admin-authored CMS content is never machine-translated (see migrations/006_language_support.sql). */
export type SupportedLanguage = "en" | "te";

/** Narrows values read back from a TEXT[] column (tenant_websites.languages) to the languages the app actually ships. */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "en" || value === "te";
}

export type EventStatus = "draft" | "published" | "cancelled";

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  bannerMediaId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EventNotificationType = "new_event" | "event_updated" | "event_cancelled";
export type EventNotificationDeliveryStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "retrying";

export interface EventNotification {
  id: string;
  tenantId: string;
  eventId: string;
  devoteeId: string;
  whatsappMessageId: string | null;
  notificationType: EventNotificationType;
  deliveryStatus: EventNotificationDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string;
  sentAt: string | null;
  deliveredAt: string | null; // reserved for a future Meta delivery-receipt webhook; unset in v1
  readAt: string | null; // reserved for future; unset in v1
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationChannel = "in_app" | "whatsapp";
export type NotificationDeliveryStatus = EventNotificationDeliveryStatus;

export const NOTIFICATION_CATEGORIES = [
  "birthday",
  "new_user",
  "devotee",
  "event",
  "announcement",
  "anniversary",
  "family",
  "platform",
  "donation",
  "festival",
  "campaign",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * Every automated/triggered notification this app sends, grouped by what
 * fires it. Deliberately kept as a TypeScript union (not a native Postgres
 * ENUM/CHECK) — see the `notification_type`/`category` column comments added
 * by migration 032 for why: this list is expected to keep growing, and a DB
 * enum would need a migration for every future addition.
 *
 * - Devotee lifecycle: birthday_devotee, birthday_priest, anniversary_devotee,
 *   anniversary_priest, family_occasion_reminder, devotee_registered.
 * - Staff/platform: user_welcome, tenant_config_changed, tenant_status_changed.
 * - Events: new_event, event_updated, event_cancelled, event_reminder,
 *   event_announcement (admin-authored, free-form).
 * - Campaigns: campaign_broadcast (generic/custom-message), donation_campaign_broadcast
 *   (goal/raised-aware — also covers closing-reminder and goal-reached sends,
 *   which reuse this same type at a later point in the campaign's lifecycle).
 * - Donations (manual staff entry): donation_thank_you (to the donor),
 *   donation_recorded (broadcast to all opted-in devotees).
 * - Donations (online/Razorpay): donation_receipt (to the donor),
 *   payment_captured (in-app only, to admins), payment_failed (donor +
 *   in-app to admins), payment_refunded (donor + in-app to admins). Manual
 *   and online donations intentionally use different type pairs — the two
 *   flows don't share the same recorded data (e.g. online donations have no
 *   devoteeId), not an inconsistency to unify.
 * - Festivals: festival_greeting (explicit per-festival media, not the
 *   tenant-media-reuse table).
 * - Announcements: temple_announcement (admin-authored, free-form — a
 *   one-off broadcast typed directly in Chatbot Settings, sent immediately
 *   to every WhatsApp-opted-in devotee; distinct from event_announcement
 *   (tied to one event) and campaign_broadcast (tied to a scheduled Campaign)).
 */
export const NOTIFICATION_TYPES = [
  "birthday_devotee",
  "birthday_priest",
  "user_welcome",
  "devotee_registered",
  "event_reminder",
  "anniversary_devotee",
  "anniversary_priest",
  "family_occasion_reminder",
  "tenant_config_changed",
  "tenant_status_changed",
  "donation_thank_you",
  "donation_recorded",
  "festival_greeting",
  "new_event",
  "event_updated",
  "event_cancelled",
  "event_announcement",
  "campaign_broadcast",
  "donation_campaign_broadcast",
  "donation_receipt",
  "payment_captured",
  "payment_failed",
  "payment_refunded",
  "temple_announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationTemplate {
  id: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  language: SupportedLanguage;
  title: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  recipientPersonId: string | null;
  recipientDevoteeId: string | null;
  recipientPhone: string | null;
  notificationType: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string | null;
  message: string;
  language: SupportedLanguage;
  metadata: Record<string, unknown>;
  mediaId: string | null;
  providerMessageId: string | null;
  deliveryStatus: NotificationDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  /** Which WhatsApp delivery path was actually used — null until the send is attempted (e.g. still pending, or in_app-only). */
  deliveryStrategy: "free_form" | "template" | null;
  /** The Meta template name actually sent, when deliveryStrategy is "template". */
  templateUsed: string | null;
  conversationStatus: "active" | "inactive" | "unknown" | null;
  /** Meta's structured numeric error code, distinct from failureReason's free text. */
  metaErrorCode: number | null;
  /** e.g. "template_missing" / "invalid_variables" / permanent Meta error — see lib/whatsapp/errors.ts. */
  metaErrorCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NOTIFICATION_MEDIA_CATEGORIES = [
  "event_banner",
  "birthday_greeting",
  "anniversary_greeting",
  "donation_thank_you",
  "festival_greeting",
  "campaign_banner",
  // Public temple website imagery (migrations/041) — same tenant-scoped
  // media table, so uploads, ImageKit cleanup and tenant isolation are
  // unchanged.
  "temple_gallery",
  "temple_deity",
  "temple_hero",
  "temple_logo",
] as const;
export type NotificationMediaCategory = (typeof NOTIFICATION_MEDIA_CATEGORIES)[number];

export interface NotificationMedia {
  id: string;
  tenantId: string;
  category: NotificationMediaCategory;
  title: string | null;
  storageKey: string;
  imageUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "archived",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * A presentation label selecting a canned audience/template/trigger
 * combination — not a different send mechanism. See lib/db/campaigns.ts.
 */
export const CAMPAIGN_TYPES = [
  "one_time",
  "recurring",
  "festival",
  "birthday",
  "event_reminder",
  "donation",
  "membership_renewal",
  "seva_reminder",
  "emergency",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export type CampaignScheduleType = "one_time" | "recurring";

/** Evaluated against devotees (+ events/donations where relevant) at send time — never snapshotted. */
export type CampaignAudienceFilter =
  | { type: "all" }
  | { type: "active" }
  | { type: "donors" }
  | { type: "opted_in" }
  | { type: "language"; language: SupportedLanguage }
  | { type: "family"; familyId: string }
  | { type: "event_attendees"; eventId: string };

export interface Campaign {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  channel: NotificationChannel;
  templateKey: NotificationType | null;
  customMessage: string | null;
  audienceFilter: CampaignAudienceFilter;
  bannerMediaId: string | null;
  linkedEventId: string | null;
  linkedDonationPurpose: string | null;
  scheduleType: CampaignScheduleType;
  scheduledAt: string | null;
  recurrenceRule: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  goalAmount: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  closingReminderSentAt: string | null;
  targetReachedAnnouncedAt: string | null;
  slug: string;
  donationToken: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantNotificationMedia {
  id: string;
  tenantId: string;
  notificationType: NotificationType;
  mediaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  personId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const GENDER_OPTIONS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const MARITAL_STATUS_OPTIONS = ["single", "married", "widowed", "divorced"] as const;
export type MaritalStatus = (typeof MARITAL_STATUS_OPTIONS)[number];

// Plain strings (not a DB CHECK), same pattern as NotificationType, so new
// relationships never need a migration — "other" is the catch-all today.
export const RELATIONSHIP_CODES = [
  "head_of_family",
  "husband",
  "wife",
  "father",
  "mother",
  "son",
  "daughter",
  "brother",
  "sister",
  "grandfather",
  "grandmother",
  "grandson",
  "granddaughter",
  "uncle",
  "aunt",
  "other",
] as const;
export type RelationshipCode = (typeof RELATIONSHIP_CODES)[number];

export function isRelationshipCode(value: unknown): value is RelationshipCode {
  return typeof value === "string" && (RELATIONSHIP_CODES as readonly string[]).includes(value);
}

export interface Devotee {
  id: string;
  tenantId: string;
  // Nullable: family members may have no mobile number of their own.
  whatsappPhone: string | null;
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
  // Devotee-level opt-out for automatic event notifications (see
  // migrations/007_event_notifications.sql) — independent of whatsappOptInStatus.
  eventNotificationsEnabled: boolean;
  familyId: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  weddingAnniversary: string | null;
  // Independent of devotee_families.address — not every devotee belongs to a family.
  address: string | null;
  notes: string | null;
  // Soft-delete (migrations/018_devotee_lifecycle.sql) — false means
  // deactivated: excluded from recipient selection and the default list
  // view, but the row and all history remain intact and reachable.
  isActive: boolean;
  // Derived via a LEFT JOIN in lib/db/devotees.ts — not stored redundantly.
  familyName: string | null;
  relationship: RelationshipCode | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevoteeFamily {
  id: string;
  tenantId: string;
  familyName: string;
  primaryDevoteeId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  primaryLanguage: SupportedLanguage | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevoteeFamilySummary extends DevoteeFamily {
  primaryDevoteeName: string | null;
  primaryDevoteePhone: string | null;
  memberCount: number;
  memberNames: string[];
}

export interface FamilyMember {
  id: string;
  familyId: string;
  devoteeId: string;
  relationship: RelationshipCode;
  isPrimary: boolean;
  createdAt: string;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "received";
export type WhatsAppMessageType = "text" | "button" | "list" | "button_reply" | "list_reply" | "unsupported";

export interface WhatsAppMessage {
  id: string;
  tenantId: string;
  devoteeId: string | null;
  direction: MessageDirection;
  fromPhone: string;
  toPhone: string;
  body: string;
  messageType: WhatsAppMessageType;
  providerMessageId: string | null;
  status: MessageStatus;
  receivedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Summary/cache row, one per devotee with >=1 message ever exchanged — a
 * WhatsApp "conversation" is always 1:1 with a devotee in this app (every
 * inbound message always resolves to a devotee before being logged, see
 * upsertDevoteeFromWhatsApp in lib/db/devotees.ts), so this is not a
 * freestanding many-to-one entity. Kept in sync by logWhatsAppMessage()
 * (lib/db/whatsapp-messages.ts), the single choke point for every send/log
 * path (webhook inbound/outbound, announcements, event notifications).
 */
export interface WhatsAppConversation {
  id: string;
  tenantId: string;
  devoteeId: string;
  lastMessageId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastDirection: MessageDirection | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** listConversations()'s read shape — joins devotee fields the conversation list needs, avoiding N+1 lookups. */
export interface ConversationSummary {
  devoteeId: string;
  displayName: string;
  whatsappPhone: string;
  isDonor: boolean;
  preferredLanguage: SupportedLanguage | null;
  whatsappOptInStatus: boolean;
  lastSeenAt: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastDirection: MessageDirection | null;
  unreadCount: number;
}

export interface WhatsAppStats {
  totalConversations: number;
  unreadConversations: number;
  todaysMessages: number;
  repliesSentToday: number;
  activeDevotees: number;
  newDevoteesFromWhatsApp: number;
  avgBotResponseSeconds: number | null;
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

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "other" | "razorpay" | "phonepe" | "upi_manual";

export interface Donation {
  id: string;
  tenantId: string;
  /** Null when this donation has no registered devotee — see manualDonor*. Exactly one of devoteeId / manualDonorName is ever set. */
  devoteeId: string | null;
  /** NUMERIC comes back from pg as a string to avoid float precision loss on money. Null for non-cash / in-kind donations. */
  amount: string | null;
  purpose: string;
  /** Null for non-cash / in-kind donations — see itemDescription. */
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  donatedAt: string;
  recordedBy: string | null;
  /** Snapshot of a non-registered donor, preserved even if they're never turned into a devotee. Null when devoteeId is set. */
  manualDonorName: string | null;
  manualDonorPhone: string | null;
  manualDonorEmail: string | null;
  manualDonorAddress: string | null;
  isAnonymous: boolean;
  /** Description of a material / in-kind gift (e.g. "5kg rice"). Set only when amount and paymentMethod are null. */
  itemDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

/** listDonations() joins devotees (when present) so the table doesn't need N+1 lookups; falls back to the manual-donor snapshot otherwise. */
export interface DonationWithDonor extends Donation {
  donorName: string;
  donorPhone: string | null;
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
