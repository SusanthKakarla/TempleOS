"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, Pencil, Trash2, Upload, UserCog, UserPlus, Users as UsersIcon, UserX } from "lucide-react";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { RoleCode, SupportedLanguage } from "@/types/db";
import { ROLE_CODES } from "@/types/db";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
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
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { UsersSearchInput } from "./users-search-input";
import { InviteUserDialog } from "./invite-user-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { ToggleUserStatusDialog } from "./toggle-user-status-dialog";
import { UserActivityPanel } from "./user-activity-panel";
import { EditUserDialog } from "./edit-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

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
  const tCommon = useTranslations("common");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<TenantMembershipListItem | null>(null);
  const [deletingMember, setDeletingMember] = useState<TenantMembershipListItem | null>(null);
  const [changingRoleMember, setChangingRoleMember] = useState<TenantMembershipListItem | null>(null);
  const [togglingStatusMember, setTogglingStatusMember] = useState<TenantMembershipListItem | null>(null);
  const [viewingActivityMember, setViewingActivityMember] = useState<TenantMembershipListItem | null>(null);

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

  const roleItems: Record<string, string> = { all: t("filters.allRoles") };
  for (const role of ROLE_CODES) roleItems[role] = t(`roleNames.${role}`);
  const statusItems: Record<string, string> = {
    all: t("filters.allStatuses"),
    active: t("status.enabled"),
    inactive: t("status.disabled"),
  };

  function statusBadge(member: TenantMembershipListItem) {
    const isActive = member.status === "active";
    return (
      <Badge variant={isActive ? "default" : "destructive"}>
        {isActive ? t("status.enabled") : t("status.disabled")}
      </Badge>
    );
  }

  function rowActionItems(member: TenantMembershipListItem) {
    const isActive = member.status === "active";
    const isSelf = member.id === currentMembershipId;
    return [
      {
        label: tCommon("edit"),
        icon: <Pencil className="size-4" />,
        onClick: () => setEditingMember(member),
      },
      {
        label: t("changeRoleDialog.title"),
        icon: <UserCog className="size-4" />,
        onClick: () => setChangingRoleMember(member),
      },
      {
        label: t("activityPanel.title"),
        icon: <History className="size-4" />,
        onClick: () => setViewingActivityMember(member),
      },
      ...(isSelf
        ? []
        : [
            {
              label: isActive ? t("status.disableAction") : t("status.enableAction"),
              icon: <UserX className="size-4" />,
              onClick: () => setTogglingStatusMember(member),
            },
            {
              label: tCommon("delete"),
              icon: <Trash2 className="size-4" />,
              variant: "destructive" as const,
              onClick: () => setDeletingMember(member),
            },
          ]),
    ];
  }

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
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="w-full sm:w-40">
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
        <>
          {/* Desktop / tablet: fixed-width table, horizontal scroll if needed */}
          <div className="hidden sm:block">
            <TableShell>
              <Table className="table-fixed">
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
                      className="w-56"
                    />
                    <TableHead className="w-36">{t("columns.phone")}</TableHead>
                    <TableHead className="w-44">{t("columns.role")}</TableHead>
                    <SortableTableHead
                      column="status"
                      label={t("columns.status")}
                      currentSort={sort}
                      currentDir={dir}
                      pathname="/dashboard/users"
                      className="w-28"
                    />
                    <TableHead className="w-32">{t("columns.joined")}</TableHead>
                    <SortableTableHead
                      column="lastSignIn"
                      label={t("columns.lastLogin")}
                      currentSort={sort}
                      currentDir={dir}
                      pathname="/dashboard/users"
                      className="w-32"
                    />
                    <TableHead className="w-16 text-right">{t("columns.actions")}</TableHead>
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
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                              {getInitials(member.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{member.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate">{member.phoneNumber}</TableCell>
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
                      <TableCell>{statusBadge(member)}</TableCell>
                      <TableCell>{formatDate(member.createdAt, locale)}</TableCell>
                      <TableCell>
                        {member.lastSignedInAt ? formatDate(member.lastSignedInAt, locale) : t("status.never")}
                      </TableCell>
                      <TableCell className="text-right">
                        <OverflowActionMenu items={rowActionItems(member)} />
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/users" />
            </TableShell>
          </div>

          {/* Mobile: one card per user, no clipped content */}
          <div className="space-y-3 sm:hidden">
            {members.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                        {getInitials(member.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.displayName}</p>
                      <p className="truncate text-sm text-muted-foreground">{member.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusBadge(member)}
                    <OverflowActionMenu items={rowActionItems(member)} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {member.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    member.roles.map((role: RoleCode) => (
                      <Badge key={role} variant="outline">
                        {t(`roleNames.${role}`)}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs">{t("columns.joined")}</p>
                    <p className="text-foreground">{formatDate(member.createdAt, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs">{t("columns.lastLogin")}</p>
                    <p className="text-foreground">
                      {member.lastSignedInAt ? formatDate(member.lastSignedInAt, locale) : t("status.never")}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/users" />
          </div>
        </>
      )}

      {editingMember && (
        <EditUserDialog
          member={editingMember}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setEditingMember(null);
          }}
          onSaved={() => {
            setEditingMember(null);
            refresh();
          }}
        />
      )}

      {deletingMember && (
        <DeleteUserDialog
          member={deletingMember}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingMember(null);
          }}
          onDeleted={() => {
            setDeletingMember(null);
            refresh();
          }}
        />
      )}

      {changingRoleMember && (
        <ChangeRoleDialog
          member={changingRoleMember}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setChangingRoleMember(null);
          }}
          onChanged={() => {
            setChangingRoleMember(null);
            refresh();
          }}
        />
      )}

      {togglingStatusMember && (
        <ToggleUserStatusDialog
          member={togglingStatusMember}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setTogglingStatusMember(null);
          }}
          onChanged={() => {
            setTogglingStatusMember(null);
            refresh();
          }}
        />
      )}

      {viewingActivityMember && (
        <UserActivityPanel
          member={viewingActivityMember}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setViewingActivityMember(null);
          }}
        />
      )}
    </div>
  );
}
