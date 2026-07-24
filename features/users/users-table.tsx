"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Download, History, Pencil, Trash2, Upload, UserCog, UserPlus, Users as UsersIcon, UserX } from "lucide-react";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { RoleCode, SupportedLanguage } from "@/types/db";
import { ROLE_CODES } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ResponsiveSearchBar } from "@/components/responsive-search-bar";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { InviteUserDialog } from "./invite-user-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { ToggleUserStatusDialog } from "./toggle-user-status-dialog";
import { UserActivityPanel } from "./user-activity-panel";
import { EditUserDialog } from "./edit-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

const MotionTableRow = motion.create(TableRow);
const PATHNAME = "/dashboard/users";

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

interface PendingFilters {
  role: string;
  status: string;
}

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  return {
    role: searchParams.get("role") ?? "all",
    status: searchParams.get("status") ?? "all",
  };
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
  const [exportOpen, setExportOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TenantMembershipListItem | null>(null);
  const [deletingMember, setDeletingMember] = useState<TenantMembershipListItem | null>(null);
  const [changingRoleMember, setChangingRoleMember] = useState<TenantMembershipListItem | null>(null);
  const [togglingStatusMember, setTogglingStatusMember] = useState<TenantMembershipListItem | null>(null);
  const [viewingActivityMember, setViewingActivityMember] = useState<TenantMembershipListItem | null>(null);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));

  function refresh() {
    router.refresh();
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? members.map((m) => m.id) : []);
  }

  function applyFilters(next: PendingFilters) {
    let params: URLSearchParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      params = mergeSearchParam(params, key, value === "all" ? null : value);
    }
    params = mergeSearchParam(params, "page", null);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const roleItems: Record<string, string> = { all: t("filters.allRoles") };
  for (const role of ROLE_CODES) roleItems[role] = t(`roleNames.${role}`);
  const statusItems: Record<string, string> = {
    all: t("filters.allStatuses"),
    active: t("status.enabled"),
    inactive: t("status.disabled"),
  };

  const activeFilterCount = Object.values(filtersFromSearchParams(searchParams)).filter((v) => v !== "all").length;

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
        icon: <Activity className="size-4" />,
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

  const filterSheetContent = (
    <div className="space-y-4 py-4">
      <div className="space-y-1.5">
        <Label>{t("columns.role")}</Label>
        <Select
          value={pendingFilters.role}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, role: v ?? "all" }))}
          items={roleItems}
        >
          <SelectTrigger className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label>{t("columns.status")}</Label>
        <Select
          value={pendingFilters.status}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, status: v ?? "all" }))}
          items={statusItems}
        >
          <SelectTrigger className="w-full">
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
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
            <Link
              href="/dashboard/users/activity"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-muted lg:inline-flex"
            >
              <History className="size-4" />
              {t("activityLog.pageTitle")}
            </Link>
            <Link
              href="/dashboard/users/import"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-muted lg:inline-flex"
            >
              <Upload className="size-4" />
              {t("importButton")}
            </Link>
            <div className="hidden lg:block">
              <ExportMenu
                exportUrl="/api/users/export"
                filterParams={searchParams}
                selectedIds={selectedIds}
                moduleLabel="users"
              />
            </div>
            <OverflowActionMenu
              label="Activity / Import / Export"
              items={[
                { label: t("activityLog.pageTitle"), icon: <History className="size-4" />, onClick: () => router.push("/dashboard/users/activity") },
                { label: t("importButton"), icon: <Upload className="size-4" />, onClick: () => router.push("/dashboard/users/import") },
                { label: "Export", icon: <Download className="size-4" />, onClick: () => setExportOpen(true) },
              ]}
            />
            {/* Rendered without its own trigger — opened programmatically from the overflow menu above (mobile/tablet path). */}
            <ExportMenu
              exportUrl="/api/users/export"
              filterParams={searchParams}
              selectedIds={selectedIds}
              moduleLabel="users"
              open={exportOpen}
              onOpenChange={setExportOpen}
              hideTrigger
            />
          </>
        }
      />

      <ResponsiveSearchBar
        pathname={PATHNAME}
        placeholder={t("searchPlaceholder")}
        filtersSlot={
          <>
            <FilterBottomSheet
              title={tCommon("filters")}
              activeCount={activeFilterCount}
              onOpenChange={(open) => {
                if (open) setPendingFilters(filtersFromSearchParams(searchParams));
              }}
              onReset={() => {
                const reset: PendingFilters = { role: "all", status: "all" };
                setPendingFilters(reset);
                applyFilters(reset);
              }}
              onApply={() => applyFilters(pendingFilters)}
            >
              {filterSheetContent}
            </FilterBottomSheet>
            <InviteUserDialog
              trigger={
                <Button className="shrink-0 gap-1.5">
                  <UserPlus className="size-4" />
                  <span className="hidden sm:inline">{t("inviteButton")}</span>
                </Button>
              }
              onInvited={refresh}
            />
          </>
        }
      />

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
          {/* Tablet + desktop: table, Phone/Joined/Last Login hidden on tablet (shown desktop-only). */}
          <div className="hidden md:block">
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
                    <SortableTableHead column="name" label={t("columns.name")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <TableHead className="hidden lg:table-cell">{t("columns.phone")}</TableHead>
                    <TableHead>{t("columns.role")}</TableHead>
                    <SortableTableHead column="status" label={t("columns.status")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <TableHead className="hidden lg:table-cell">{t("columns.joined")}</TableHead>
                    <SortableTableHead
                      column="lastSignIn"
                      label={t("columns.lastLogin")}
                      currentSort={sort}
                      currentDir={dir}
                      pathname={PATHNAME}
                      className="hidden lg:table-cell"
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
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                              {getInitials(member.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{member.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden truncate lg:table-cell">{member.phoneNumber}</TableCell>
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
                      <TableCell className="hidden lg:table-cell">{formatDate(member.createdAt, locale)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {member.lastSignedInAt ? formatDate(member.lastSignedInAt, locale) : t("status.never")}
                      </TableCell>
                      <TableCell className="text-right">
                        <OverflowActionMenu items={rowActionItems(member)} />
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
            </TableShell>
          </div>

          {/* Mobile: compact high-density list, ~64px rows. */}
          <div className="space-y-3 md:hidden">
            <MobileListView>
              {members.map((member) => (
                <MobileListRow
                  key={member.id}
                  leading={
                    <Avatar className="size-9">
                      <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                        {getInitials(member.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  }
                  title={member.displayName}
                  subtitle={`${member.phoneNumber} · ${member.roles.length ? member.roles.map((role) => t(`roleNames.${role}`)).join(", ") : "—"}`}
                  badge={statusBadge(member)}
                  trailing={<OverflowActionMenu items={rowActionItems(member)} />}
                />
              ))}
            </MobileListView>
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
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
