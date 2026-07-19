import { getSessionAdmin } from "@/lib/auth/session";
import { listConversations } from "@/lib/db/whatsapp-conversations";
import { ConversationList } from "@/features/whatsapp/conversation-list";
import type { SupportedLanguage } from "@/types/db";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Shared by both page.tsx and default.tsx in this @list parallel-route slot
 * — default.tsx is required so the slot still renders when the sibling
 * [devoteeId] route is active (that segment has no matching @list route of
 * its own), and it needs the exact same filtered list, not an empty state.
 */
export async function ConversationListSlot({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSessionAdmin();
  if (!session) return null;

  const params = await searchParams;
  const getParam = (key: string): string | undefined => (typeof params[key] === "string" ? params[key] : undefined);

  const conversations = await listConversations(session.tenantId, {
    search: getParam("search"),
    language: getParam("language") as SupportedLanguage | undefined,
    period: getParam("period") as "today" | "week" | undefined,
    donorsOnly: getParam("donors") === "true",
    optedInOnly: getParam("optedIn") === "true",
    unreadOnly: getParam("unread") === "true",
  });

  return <ConversationList conversations={conversations} />;
}
