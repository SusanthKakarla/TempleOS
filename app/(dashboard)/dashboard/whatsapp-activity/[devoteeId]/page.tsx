import { notFound } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";
import { getDevoteeById } from "@/lib/db/devotees";
import { getConversationByDevoteeId } from "@/lib/db/whatsapp-conversations";
import { listMessagesForDevotee } from "@/lib/db/whatsapp-messages";
import { ConversationHeader } from "@/features/whatsapp/conversation-header";
import { ConversationDetailsStrip } from "@/features/whatsapp/conversation-details-strip";
import { ConversationThread } from "@/features/whatsapp/conversation-thread";
import { MarkConversationRead } from "@/features/whatsapp/mark-conversation-read";

interface PageProps {
  params: Promise<{ devoteeId: string }>;
}

export default async function ConversationThreadPage({ params }: PageProps) {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const { devoteeId } = await params;
  const [conversation, devotee] = await Promise.all([
    getConversationByDevoteeId(session.tenantId, devoteeId),
    getDevoteeById(session.tenantId, devoteeId),
  ]);
  if (!conversation || !devotee) notFound();

  const messages = await listMessagesForDevotee(session.tenantId, devoteeId, { limit: 50 });

  return (
    <div className="flex h-full flex-col">
      <MarkConversationRead devoteeId={devoteeId} />
      <ConversationHeader conversation={conversation} />
      <ConversationDetailsStrip devotee={devotee} />
      <ConversationThread devoteeId={devoteeId} initialMessages={messages} />
    </div>
  );
}
