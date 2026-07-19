import { MessageCircle } from "lucide-react";

export default function WhatsAppActivityIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Select a conversation</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Choose a devotee from the list to view their full WhatsApp message history.
      </p>
    </div>
  );
}
