import { getLocale, getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    return (
      <div className="glass-card flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.action")}</TableHead>
            <TableHead>{t("columns.user")}</TableHead>
            <TableHead>{t("columns.changedBy")}</TableHead>
            <TableHead>{t("columns.timestamp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{actionLabel(entry.action)}</TableCell>
              <TableCell>{entry.targetId ? actorName(entry.targetId) : "—"}</TableCell>
              <TableCell>{actorName(entry.actorId)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDateTime(entry.createdAt, locale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
