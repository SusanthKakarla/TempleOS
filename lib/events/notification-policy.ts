import type { Event, EventNotificationType, Tenant } from "@/types/db";

/** Fields whose change on an already-published event is devotee-visible. */
function materialFieldsChanged(prior: Event, next: Event): boolean {
  return (
    prior.title !== next.title ||
    prior.startsAt !== next.startsAt ||
    prior.endsAt !== next.endsAt ||
    prior.location !== next.location ||
    prior.description !== next.description
  );
}

/**
 * Decides which (if any) notification an event PATCH should trigger, purely
 * from prior vs. next state. published→draft ("unpublish") intentionally
 * sends nothing — an admin correction, not a devotee-facing announcement;
 * the manual "Send Announcement" flow remains available for a deliberate
 * re-broadcast. (draft|cancelled)→published covers both first publish and
 * reopening a previously-cancelled event.
 */
export function decideEventNotificationType(prior: Event, next: Event): EventNotificationType | null {
  if (next.status === "cancelled" && prior.status !== "cancelled") return "event_cancelled";
  if ((prior.status === "draft" || prior.status === "cancelled") && next.status === "published") {
    return "new_event";
  }
  if (prior.status === "published" && next.status === "published" && materialFieldsChanged(prior, next)) {
    return "event_updated";
  }
  return null;
}

export function isAutoNotifyEnabled(tenant: Tenant, type: EventNotificationType): boolean {
  return {
    new_event: tenant.notifyOnNewEvent,
    event_updated: tenant.notifyOnEventUpdated,
    event_cancelled: tenant.notifyOnEventCancelled,
  }[type];
}
