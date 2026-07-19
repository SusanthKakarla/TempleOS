"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fires once on mount to clear this conversation's unread count, then
 * refreshes so the list panel's badge/sort updates — matches this app's
 * existing refresh-after-mutation convention (no WebSockets/polling).
 */
export function MarkConversationRead({ devoteeId }: { devoteeId: string }) {
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/whatsapp/conversations/${devoteeId}/read`, { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per devoteeId, not on every router identity change
  }, [devoteeId]);

  return null;
}
