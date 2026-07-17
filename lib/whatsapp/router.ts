import type { InteractionType } from "@/types/db";

export type WhatsAppCommand = "menu" | "events" | "contact" | "unknown";

const GREETINGS = new Set(["hi", "hello", "hey", "namaste", "start", "menu"]);

function normalize(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?]+$/g, "");
}

/**
 * Deterministic, stateless command classifier for the WhatsApp devotee flow.
 * There is no persisted conversation state (NFR-009: no AI-generated
 * answers) — every inbound message is classified from its own body only.
 */
export function classifyCommand(rawBody: string | null | undefined): WhatsAppCommand {
  const body = normalize(rawBody);

  if (body === "1" || body === "events") return "events";
  if (body === "2" || body === "contact") return "contact";
  if (body === "" || GREETINGS.has(body)) return "menu";

  return "unknown";
}

const INTERACTION_TYPE_BY_COMMAND: Record<WhatsAppCommand, InteractionType> = {
  menu: "menu",
  events: "viewed_events",
  contact: "requested_contact",
  unknown: "unknown",
};

export function commandToInteractionType(command: WhatsAppCommand): InteractionType {
  return INTERACTION_TYPE_BY_COMMAND[command];
}
