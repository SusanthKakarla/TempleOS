"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HandCoins, Plus } from "lucide-react";
import type { TempleSeva } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/currency";
import { SevaFormDialog } from "./seva-form-dialog";

function formatDays(
  days: TempleSeva["availableDays"],
  t: ReturnType<typeof useTranslations>,
  everyDayLabel: string,
): string {
  if (days.length === 0) return everyDayLabel;
  return days.map((day) => t(`days.${day}`)).join(", ");
}

export function SevasTable({ sevas }: { sevas: TempleSeva[] }) {
  const router = useRouter();
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.sevasTable");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(seva: TempleSeva) {
    if (!window.confirm(tForm("deleteConfirm", { name: seva.name }))) return;
    setError(null);
    setPendingId(seva.id);
    try {
      const response = await fetch(`/api/temple-sevas/${seva.id}`, { method: "DELETE" });
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
        <SevaFormDialog
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
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {sevas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HandCoins className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{tForm("emptyState")}</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tForm("columns.name")}</TableHead>
                  <TableHead>{tForm("columns.price")}</TableHead>
                  <TableHead>{tForm("columns.duration")}</TableHead>
                  <TableHead>{tForm("columns.availableDays")}</TableHead>
                  <TableHead>{tForm("columns.booking")}</TableHead>
                  <TableHead className="text-right">{tForm("columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sevas.map((seva) => (
                  <TableRow key={seva.id}>
                    <TableCell>
                      <p className="font-medium">{seva.name}</p>
                      {seva.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {seva.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{seva.price ? formatInr(seva.price) : "—"}</TableCell>
                    <TableCell>{seva.duration ?? "—"}</TableCell>
                    <TableCell>{formatDays(seva.availableDays, t, tForm("everyDay"))}</TableCell>
                    <TableCell>
                      <Badge variant={seva.bookingEnabled ? "default" : "secondary"}>
                        {seva.bookingEnabled ? tForm("enabled") : tForm("disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <SevaFormDialog
                        mode="edit"
                        seva={seva}
                        trigger={
                          <Button variant="outline" size="sm" disabled={pendingId === seva.id}>
                            {t("common.edit")}
                          </Button>
                        }
                        onSaved={refresh}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={pendingId === seva.id}
                        onClick={() => handleDelete(seva)}
                      >
                        {t("common.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
