import type { InteractionType } from "@/types/db";

export type WhatsAppCommand =
  | "menu"
  | "events"
  | "contact"
  | "timings"
  | "history"
  | "sevas"
  | "faq"
  | "unknown";

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
  if (body === "3" || body === "timings" || body === "hours") return "timings";
  if (body === "4" || body === "history" || body === "about") return "history";
  if (body === "5" || body === "sevas" || body === "services") return "sevas";
  if (body === "6" || body === "faq" || body === "questions") return "faq";
  if (body === "" || GREETINGS.has(body)) return "menu";

  return "unknown";
}

const INTERACTION_TYPE_BY_COMMAND: Record<WhatsAppCommand, InteractionType> = {
  menu: "menu",
  events: "viewed_events",
  contact: "requested_contact",
  timings: "viewed_timings",
  history: "viewed_history",
  sevas: "viewed_sevas",
  faq: "viewed_faq",
  unknown: "unknown",
};

export function commandToInteractionType(command: WhatsAppCommand): InteractionType {
  return INTERACTION_TYPE_BY_COMMAND[command];
}
