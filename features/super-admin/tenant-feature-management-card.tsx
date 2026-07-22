"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TenantFeatureWithCatalog } from "@/lib/db/tenant-features";

export function TenantFeatureManagementCard({
  tenantId,
  features,
}: {
  tenantId: string;
  features: TenantFeatureWithCatalog[];
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const realFeatures = features.filter((f) => f.category !== "coming_soon");
  const comingSoon = features.filter((f) => f.category === "coming_soon");

  async function toggle(feature: TenantFeatureWithCatalog) {
    if (feature.isCore) return;
    setPendingKey(feature.key);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: feature.key, enabled: !feature.enabled }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to update feature");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update feature");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="glass-card space-y-4 rounded-2xl p-4">
      <div>
        <h2 className="text-base font-semibold tracking-normal">Feature Management</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable modules for this temple. Changes apply immediately — no redeploy needed.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="divide-y rounded-lg border">
        {realFeatures.map((feature) => (
          <div key={feature.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {feature.displayName}
                {feature.isCore && <Lock className="size-3 text-muted-foreground" />}
              </p>
              {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={feature.enabled ? "default" : "secondary"}>
                {feature.enabled ? "Enabled" : "Disabled"}
              </Badge>
              {feature.isCore ? (
                <Badge variant="outline">Always on</Badge>
              ) : (
                <Button
                  variant={feature.enabled ? "destructive" : "success"}
                  size="sm"
                  disabled={pendingKey === feature.key}
                  onClick={() => toggle(feature)}
                >
                  {feature.enabled ? "Disable" : "Enable"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {comingSoon.length > 0 && (
        <details className="rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium">Coming soon ({comingSoon.length})</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {comingSoon.map((feature) => (
              <Badge key={feature.key} variant="outline">
                {feature.displayName}
              </Badge>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
