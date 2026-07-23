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
  "roles_permissions",
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

export type TenantDomainKind = "primary" | "custom";
export type TenantDomainStatus = "active" | "inactive";

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

/** WhatsApp chatbot UI language. Only the bot's own chrome is localized —
 * admin-authored CMS content is never machine-translated (see migrations/006_language_support.sql). */
export type SupportedLanguage = "en" | "te";

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
export type NotificationCategory =
  | "birthday"
  | "new_user"
  | "devotee"
  | "event"
  | "announcement"
  | "anniversary"
  | "family"
  | "platform"
  | "donation"
  | "festival";
export type NotificationType =
  | "birthday_devotee"
  | "birthday_priest"
  | "user_welcome"
  | "devotee_registered"
  | "event_reminder"
  | "anniversary_devotee"
  | "anniversary_priest"
  | "family_occasion_reminder"
  | "tenant_config_changed"
  | "tenant_status_changed"
  | "donation_thank_you"
  | "festival_greeting";

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
  notificationType: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string | null;
  message: string;
  language: SupportedLanguage;
  metadata: Record<string, unknown>;
  mediaId: string | null;
  deliveryStatus: NotificationDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NOTIFICATION_MEDIA_CATEGORIES = [
  "event_banner",
  "birthday_greeting",
  "anniversary_greeting",
  "donation_thank_you",
  "festival_greeting",
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
