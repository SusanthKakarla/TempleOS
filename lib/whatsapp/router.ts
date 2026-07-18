import type { InteractionType } from "@/types/db";

export type WhatsAppCommand =
  | "menu"
  | "events"
  | "contact"
  | "timings"
  | "history"
  | "sevas"
  | "faq"
  | "donation_info"
  | "help"
  | "change_language"
  | "select_language_en"
  | "select_language_te"
  | "unknown";

// No nested conversation state exists (see classifyCommand's doc comment
// below), so "Back"/"Home" are simply aliases for the main menu.
const GREETINGS = new Set([
  "hi",
  "hello",
  "hey",
  "namaste",
  "start",
  "menu",
  "home",
  "back",
  "మెను",
  "హోమ్",
  "వెనుకకు",
]);

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
 * Recognizes both English and Telugu keywords for every command (see
 * migrations/006_language_support.sql); Telugu has no case, so `normalize`
 * (trim/lowercase/strip trailing punctuation) needs no special handling.
 */
export function classifyCommand(rawBody: string | null | undefined): WhatsAppCommand {
  const body = normalize(rawBody);

  if (body === "1" || body === "events" || body === "కార్యక్రమాలు") return "events";
  if (body === "2" || body === "contact" || body === "సంప్రదించండి") return "contact";
  if (body === "3" || body === "timings" || body === "hours" || body === "సమయాలు") return "timings";
  if (body === "4" || body === "history" || body === "about" || body === "చరిత్ర") return "history";
  if (body === "5" || body === "sevas" || body === "services" || body === "సేవలు") return "sevas";
  if (body === "6" || body === "faq" || body === "questions" || body === "ప్రశ్నలు") return "faq";
  if (body === "7" || body === "donate" || body === "donation" || body === "విరాళం") return "donation_info";
  if (body === "8" || body === "language" || body === "భాష") return "change_language";
  if (body === "help" || body === "సహాయం") return "help";
  if (body === "" || GREETINGS.has(body)) return "menu";

  return "unknown";
}

// Every list row's id is its own WhatsAppCommand string; the two language
// buttons map to their own pseudo-commands — a flat lookup, no prefix parsing.
const INTERACTIVE_REPLY_ID_TO_COMMAND: Record<string, WhatsAppCommand> = {
  events: "events",
  contact: "contact",
  timings: "timings",
  history: "history",
  sevas: "sevas",
  faq: "faq",
  donation_info: "donation_info",
  change_language: "change_language",
  lang_en: "select_language_en",
  lang_te: "select_language_te",
};

/** Classifies a tapped WhatsApp interactive button/list reply by its id. */
export function classifyInteractiveReplyId(id: string | null | undefined): WhatsAppCommand {
  return INTERACTIVE_REPLY_ID_TO_COMMAND[id ?? ""] ?? "unknown";
}

const INTERACTION_TYPE_BY_COMMAND: Record<WhatsAppCommand, InteractionType> = {
  menu: "menu",
  events: "viewed_events",
  contact: "requested_contact",
  timings: "viewed_timings",
  history: "viewed_history",
  sevas: "viewed_sevas",
  faq: "viewed_faq",
  donation_info: "viewed_donation_info",
  help: "viewed_help",
  change_language: "requested_language_change",
  select_language_en: "selected_language",
  select_language_te: "selected_language",
  unknown: "unknown",
};

export function commandToInteractionType(command: WhatsAppCommand): InteractionType {
  return INTERACTION_TYPE_BY_COMMAND[command];
}
