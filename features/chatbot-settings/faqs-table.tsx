"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HelpCircle, Plus } from "lucide-react";
import type { TempleFaq } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqFormDialog } from "./faq-form-dialog";

export function FaqsTable({ faqs }: { faqs: TempleFaq[] }) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings.common");
  const tForm = useTranslations("chatbotSettings.faqsTable");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(faq: TempleFaq) {
    if (!window.confirm(tForm("deleteConfirm"))) return;
    setError(null);
    setPendingId(faq.id);
    try {
      const response = await fetch(`/api/temple-faqs/${faq.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tForm("deleteError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tForm("deleteError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{tForm("cardTitle")}</CardTitle>
          <CardDescription>{tForm("cardDescription")}</CardDescription>
        </div>
        <FaqFormDialog
          mode="create"
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {tForm("addButton")}
            </Button>
          }
          onSaved={refresh}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {faqs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HelpCircle className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{tForm("emptyState")}</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {faqs.map((faq) => (
              <div key={faq.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{faq.question}</p>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <FaqFormDialog
                    mode="edit"
                    faq={faq}
                    trigger={
                      <Button variant="outline" size="sm" disabled={pendingId === faq.id}>
                        {t("edit")}
                      </Button>
                    }
                    onSaved={refresh}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === faq.id}
                    onClick={() => handleDelete(faq)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
