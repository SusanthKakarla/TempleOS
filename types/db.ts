export interface Tenant {
  id: string;
  slug: string;
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
  actorType: "super_admin" | "tenant_member";
  actorId: string;
  tenantId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SuperAdmin {
  id: string;
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
  status: WhatsAppAccountStatus;
  connectedAt: string | null;
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
  // Devotee-level opt-out for automatic event notifications (see
  // migrations/007_event_notifications.sql) — independent of whatsappOptInStatus.
  eventNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
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
