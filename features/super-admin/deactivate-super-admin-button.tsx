"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeactivateSuperAdminButton({ id, displayName }: { id: string; displayName: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleDeactivate() {
    if (!window.confirm(`Remove Super Admin access for ${displayName}? They can be added again later.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/super-admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to remove Super Admin access");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to remove Super Admin access");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" disabled={submitting} onClick={handleDeactivate}>
      <UserX className="size-3.5" />
      {submitting ? "Removing..." : "Remove access"}
    </Button>
  );
}
