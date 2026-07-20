"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, Upload, UserPlus, Users as UsersIcon } from "lucide-react";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { RoleCode, SupportedLanguage } from "@/types/db";
import { ROLE_CODES } from "@/types/db";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { ExportMenu } from "@/features/export/export-menu";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { UsersSearchInput } from "./users-search-input";
import { InviteUserDialog } from "./invite-user-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { UserActivityPanel } from "./user-activity-panel";

const MotionTableRow = motion.create(TableRow);

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

interface UsersTableProps {
  members: TenantMembershipListItem[];
  currentMembershipId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: "name" | "status" | "lastSignIn";
  dir: "asc" | "desc";
}

export function UsersTable({
  members,
  currentMembershipId,
  page,
  pageSize,
  totalCount,
  sort,
  dir,
}: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("userManagement");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function refresh() {
    router.refresh();
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? members.map((m) => m.id) : []);
  }

  function updateFilter(key: "status" | "role", value: string) {
    const params = mergeSearchParam(searchParams, key, value === "all" ? null : value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function handleToggleStatus(member: TenantMembershipListItem) {
    const nextStatus = member.status === "active" ? "inactive" : "active";
    const confirmMessage =
      nextStatus === "inactive"
        ? t("confirmDisable", { name: member.displayName })
        : t("confirmEnable", { name: member.displayName });
    if (!window.confirm(confirmMessage)) return;

    setError(null);
    setPendingId(member.id);
    try {
      const response = await fetch(`/api/users/${member.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? (nextStatus === "inactive" ? t("disableError") : t("enableError")));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("disableError"));
    } finally {
      setPendingId(null);
    }
  }

  const roleItems: Record<string, string> = { all: t("filters.allRoles") };
  for (const role of ROLE_CODES) roleItems[role] = t(`roleNames.${role}`);
  const statusItems: Record<string, string> = {
    all: t("filters.allStatuses"),
    active: t("status.enabled"),
    inactive: t("status.disabled"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
            <Link
              href="/dashboard/users/activity"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <History className="size-4" />
              {t("activityLog.pageTitle")}
            </Link>
            <Link href="/dashboard/users/import" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
              <Upload className="size-4" />
              {t("importButton")}
            </Link>
            <ExportMenu
              exportUrl="/api/users/export"
              filterParams={searchParams}
              selectedIds={selectedIds}
              moduleLabel="users"
            />
            <InviteUserDialog
              trigger={
                <Button className="gap-1.5">
                  <UserPlus className="size-4" />
                  {t("inviteButton")}
                </Button>
              }
              onInvited={refresh}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <UsersSearchInput />
        <Select value={searchParams.get("role") ?? "all"} onValueChange={(v) => updateFilter("role", v ?? "all")} items={roleItems}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateFilter("status", v ?? "all")} items={statusItems}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {members.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <InviteUserDialog
              trigger={
                <Button className="gap-1.5">
                  <UserPlus className="size-4" />
                  {t("inviteButton")}
                </Button>
              }
              onInvited={refresh}
            />
          }
        />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === members.length}
                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    aria-label={t("selectAll")}
                  />
                </TableHead>
                <SortableTableHead
                  column="name"
                  label={t("columns.name")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/users"
                />
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead>{t("columns.role")}</TableHead>
                <SortableTableHead
                  column="status"
                  label={t("columns.status")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/users"
                />
                <TableHead>{t("columns.joined")}</TableHead>
                <SortableTableHead
                  column="lastSignIn"
                  label={t("columns.lastLogin")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/users"
                />
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
              {members.map((member) => (
                <MotionTableRow key={member.id} variants={rowFadeIn}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(member.id)}
                      onCheckedChange={(checked) => toggleSelected(member.id, checked === true)}
                      aria-label={t("selectRow", { name: member.displayName })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.phoneNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        member.roles.map((role: RoleCode) => (
                          <Badge key={role} variant="outline">
                            {t(`roleNames.${role}`)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "active" ? "default" : "secondary"}>
                      {member.status === "active" ? t("status.enabled") : t("status.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(member.createdAt, locale)}</TableCell>
                  <TableCell>
                    {member.lastSignedInAt ? formatDate(member.lastSignedInAt, locale) : t("status.never")}
                  </TableCell>
                  <TableCell className="flex flex-wrap justify-end gap-2">
                    <ChangeRoleDialog
                      member={member}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === member.id}>
                          {t("changeRoleDialog.title")}
                        </Button>
                      }
                      onChanged={refresh}
                    />
                    {member.id !== currentMembershipId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === member.id}
                        onClick={() => handleToggleStatus(member)}
                      >
                        {member.status === "active" ? t("status.disabled") : t("status.enabled")}
                      </Button>
                    )}
                    <UserActivityPanel
                      member={member}
                      trigger={
                        <Button variant="ghost" size="sm">
                          {t("activityPanel.title")}
                        </Button>
                      }
                    />
                  </TableCell>
                </MotionTableRow>
              ))}
            </motion.tbody>
          </Table>
          <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/users" />
        </TableShell>
      )}
    </div>
  );
}
