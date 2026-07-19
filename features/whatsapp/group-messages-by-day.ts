import { isSameDay } from "date-fns";
import type { WhatsAppMessage } from "@/types/db";

export interface MessageWithSeparator {
  message: WhatsAppMessage;
  showSeparator: boolean;
}

/** Messages must already be oldest-first. Flags the first message of each new calendar day. */
export function groupMessagesByDay(messages: WhatsAppMessage[]): MessageWithSeparator[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const showSeparator = !previous || !isSameDay(new Date(previous.createdAt), new Date(message.createdAt));
    return { message, showSeparator };
  });
}
