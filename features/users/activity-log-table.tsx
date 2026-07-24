import { getLocale, getTranslations } from "next-intl/server";
import { History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { formatDateTime } from "@/lib/date";
import type { AuditLogEntry, SupportedLanguage } from "@/types/db";

export async function ActivityLogTable({
  entries,
  memberNames,
}: {
  entries: AuditLogEntry[];
  memberNames: Record<string, string>;
}) {
  const locale = (await getLocale()) as SupportedLanguage;
  const t = await getTranslations("userManagement.activityLog");

  function actorName(id: string): string {
    return memberNames[id] ?? id.slice(0, 8);
  }

  function actionLabel(action: string): string {
    return t.has(`actionLabels.${action}`) ? t(`actionLabels.${action}`) : action;
  }

  if (entries.length === 0) {
    return <EmptyState icon={<History className="size-6" />} title={t("empty")} />;
  }

  return (
    <>
      <div className="hidden md:block">
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.action")}</TableHead>
                <TableHead>{t("columns.user")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.changedBy")}</TableHead>
                <TableHead>{t("columns.timestamp")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{actionLabel(entry.action)}</TableCell>
                  <TableCell>{entry.targetId ? actorName(entry.targetId) : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{actorName(entry.actorId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(entry.createdAt, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </div>

      <div className="md:hidden">
        <MobileListView>
          {entries.map((entry) => (
            <MobileListRow
              key={entry.id}
              title={actionLabel(entry.action)}
              subtitle={`${entry.targetId ? actorName(entry.targetId) : "—"} · ${t("columns.changedBy")}: ${actorName(entry.actorId)}`}
              trailing={
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.createdAt, locale)}
                </span>
              }
            />
          ))}
        </MobileListView>
      </div>
    </>
  );
}
