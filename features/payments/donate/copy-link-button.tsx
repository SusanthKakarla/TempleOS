"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Explicit "Copy link" — distinct from ShareButton, which opens the OS share
 * sheet where one exists and only falls back to the clipboard. On desktop
 * (no navigator.share) the two would behave identically, so this exists to
 * give the action its own visible affordance rather than hiding copying
 * behind a share icon.
 */
export function CopyLinkButton({
  url,
  size = "default",
  className,
}: {
  url: string;
  size?: "default" | "xl";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure context or denied permission) — nothing more we can do
    }
  }

  return (
    <Button variant="outline" size={size} onClick={handleCopy} className={cn("gap-1.5", className)} aria-live="polite">
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
