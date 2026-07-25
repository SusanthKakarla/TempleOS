"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function ChatbotSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chatbot Settings failed to load:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader title="Chatbot Settings" subtitle="Temple configuration, FAQs, and notifications." />
      <EmptyState
        icon={<AlertTriangle className="size-6" />}
        title="This section couldn't load"
        description="Something went wrong while loading Chatbot Settings. Your other tabs and data are unaffected — try again."
        action={
          <Button onClick={reset} className="gap-1.5">
            <RotateCcw className="size-4" />
            Try again
          </Button>
        }
      />
    </div>
  );
}
