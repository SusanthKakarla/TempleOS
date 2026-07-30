"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("chatbotSettings");

  useEffect(() => {
    console.error("Chatbot Settings failed to load:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} />
      <EmptyState
        icon={<AlertTriangle className="size-6" />}
        title={t("error.title")}
        description={t("error.description")}
        action={
          <Button onClick={reset} className="gap-1.5">
            <RotateCcw className="size-4" />
            {t("error.tryAgain")}
          </Button>
        }
      />
    </div>
  );
}
