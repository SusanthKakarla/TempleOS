"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  url: string;
  /** Defaults match every existing caller's look exactly — only pass to visually match a custom surrounding layout (e.g. sitting next to a larger CTA in DonateHero). */
  size?: "default" | "xl";
  className?: string;
}

export function ShareButton({ title, url, size = "default", className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard as a no-op
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }

  return (
    <Button variant="outline" size={size} onClick={handleShare} className={cn("gap-1.5", className)}>
      <Share2 className="size-4" />
      {copied ? "Link copied!" : "Share"}
    </Button>
  );
}
