export interface Tenant {
  id: string;
  name: string;
  defaultContactPhone: string | null;
  address: string | null;
  timezone: string;
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

export type InteractionType = "menu" | "viewed_events" | "requested_contact" | "unknown";

export interface WhatsAppInteraction {
  id: string;
  tenantId: string;
  devoteeId: string | null;
  interactionType: InteractionType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
