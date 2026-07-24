"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { PaginationControls } from "@/components/pagination-controls";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { SuperAdminTenantSummary } from "@/lib/db/tenants";

function pluralizeMembers(count: number): string {
  return `${count} active ${count === 1 ? "member" : "members"}`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TemplesList({ temples }: { temples: SuperAdminTenantSummary[] }) {
  const [page, setPage] = useState(1);
  const pagedTemples = temples.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

  return (
    <>
      <div className="hidden md:block">
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Temple</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Primary Admin</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedTemples.map((temple) => (
                <TableRow key={temple.id}>
                  <TableCell>
                    <div className="min-w-52">
                      <p className="font-medium">{temple.name}</p>
                      <p className="text-xs text-muted-foreground">{temple.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {temple.primaryHostname ? (
                      <span className="inline-flex items-center gap-2">
                        <Globe2 className="size-4 text-muted-foreground" />
                        {temple.primaryHostname}
                      </span>
                    ) : (
                      <Badge variant="outline">Missing domain</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {temple.primaryAdminName ? (
                      <div className="min-w-48">
                        <p className="inline-flex items-center gap-2">
                          <UsersRound className="size-4 text-muted-foreground" />
                          {temple.primaryAdminName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {temple.primaryAdminPhoneNumber ?? "Phone unavailable"} · {pluralizeMembers(temple.activeMemberCount)}
                        </p>
                      </div>
                    ) : (
                      <div className="min-w-48">
                        <Badge variant="outline">No admin member</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{pluralizeMembers(temple.activeMemberCount)}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatTimestamp(temple.lastUpdatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/super-admin/temples/${temple.id}`} />}>
                      View
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={temples.length} onPageChange={setPage} />
        </TableShell>
      </div>

      <div className="space-y-3 md:hidden">
        <MobileListView>
          {pagedTemples.map((temple) => (
            <MobileListRow
              key={temple.id}
              href={`/super-admin/temples/${temple.id}`}
              title={temple.name}
              subtitle={temple.primaryHostname ?? temple.slug}
              badge={
                temple.primaryAdminName ? (
                  <span className="text-xs text-muted-foreground">{pluralizeMembers(temple.activeMemberCount)}</span>
                ) : (
                  <Badge variant="outline">No admin</Badge>
                )
              }
            />
          ))}
        </MobileListView>
        <PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={temples.length} onPageChange={setPage} />
      </div>
    </>
  );
}
