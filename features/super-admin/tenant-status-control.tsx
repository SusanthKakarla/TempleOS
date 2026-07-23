"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TENANT_STATUSES, type TenantStatus } from "@/types/db";

const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  maintenance: "Maintenance",
  archived: "Archived",
  disabled: "Disabled",
};

const STATUS_BADGE_VARIANT: Record<TenantStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  suspended: "destructive",
  maintenance: "outline",
  archived: "secondary",
  disabled: "destructive",
};

const STATUS_ITEMS = Object.fromEntries(TENANT_STATUSES.map((s) => [s, STATUS_LABELS[s]]));

export function TenantStatusControl({ tenantId, status }: { tenantId: string; status: TenantStatus }) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<TenantStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmChange() {
    if (!pendingStatus) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to change status");
      }
      setPendingStatus(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Current status</span>
        <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={pendingStatus ?? status}
          onValueChange={(v) => setPendingStatus((v as TenantStatus) ?? status)}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TENANT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pendingStatus && pendingStatus !== status && (
          <Button
            variant={pendingStatus === "active" ? "success" : "destructive"}
            size="sm"
            onClick={confirmChange}
            disabled={submitting}
          >
            {submitting ? "Saving..." : `Set ${STATUS_LABELS[pendingStatus]}`}
          </Button>
        )}
      </div>
      {status !== "active" && (
        <p className="text-xs text-muted-foreground">
          This temple&apos;s staff cannot sign in, use the dashboard/API, or receive automated notifications while not Active.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
