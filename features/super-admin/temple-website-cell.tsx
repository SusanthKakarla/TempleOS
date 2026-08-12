"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  tenantId: string;
  hostname: string | null;
  /** null = no website row provisioned; false = provisioned but unpublished; true = live. */
  published: boolean | null;
}

/**
 * A temple's public-website status and the actions on it, shown in the Super
 * Admin temples list.
 *
 * Publishing goes through the existing per-temple Super Admin endpoint, which
 * re-checks requireSuperAdmin server-side and takes the tenant from its own
 * route path. The id below only addresses the route — it grants nothing, and
 * a non-Super-Admin calling the same URL is rejected regardless of what they
 * send.
 */
export function TempleWebsiteCell({ tenantId, hostname, published }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setPublished(next: boolean) {
    setPending(true);
    try {
      const response = await fetch(`/api/super-admin/temples/${tenantId}/website`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not update the website.");
      toast.success(next ? "Website published." : "Website unpublished.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the website.");
    } finally {
      setPending(false);
    }
  }

  if (published === null || !hostname) {
    return (
      <div className="min-w-56 space-y-1">
        <Badge variant="outline">No website</Badge>
        <p className="text-xs text-muted-foreground">
          {hostname ? "Not provisioned yet" : "No website address provisioned"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-56 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Unpublished"}</Badge>
      </div>
      <p className="truncate text-xs text-muted-foreground">{hostname}</p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          render={<a href={`https://${hostname}`} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink className="size-3.5" />
          View
        </Button>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" render={<Link href={`/super-admin/temples/${tenantId}`} />}>
          <Settings2 className="size-3.5" />
          Manage
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setPublished(!published)}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : published ? "Unpublish" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
