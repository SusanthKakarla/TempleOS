"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUpload } from "./media-upload";
import type { NotificationMedia } from "@/types/db";

const FESTIVALS = [
  "Ugadi",
  "Sri Rama Navami",
  "Vinayaka Chavithi",
  "Krishna Janmashtami",
  "Dasara",
  "Deepavali",
  "Karthika Masam",
  "Maha Shivaratri",
] as const;

interface FestivalMediaGridProps {
  initialMedia: NotificationMedia[];
}

export function FestivalMediaGrid({ initialMedia }: FestivalMediaGridProps) {
  const [mediaByFestival, setMediaByFestival] = useState<Record<string, NotificationMedia | null>>(() => {
    const map: Record<string, NotificationMedia | null> = {};
    for (const festival of FESTIVALS) {
      map[festival] = initialMedia.find((m) => m.title === festival) ?? null;
    }
    return map;
  });
  const [sendState, setSendState] = useState<Record<string, "idle" | "sending" | "sent">>({});

  async function handleSend(festival: string) {
    const media = mediaByFestival[festival];
    if (!media) return;
    setSendState((prev) => ({ ...prev, [festival]: "sending" }));
    try {
      await fetch(`/api/notification-media/${media.id}/send-festival-greeting`, { method: "POST" });
      setSendState((prev) => ({ ...prev, [festival]: "sent" }));
    } catch {
      setSendState((prev) => ({ ...prev, [festival]: "idle" }));
    }
  }

  return (
    <div className="glass-card space-y-5 rounded-2xl p-4">
      <div>
        <p className="text-sm font-medium">Festival banners</p>
        <p className="text-xs text-muted-foreground">
          Upload a banner per festival, then send it to every opted-in devotee whenever you&apos;re ready.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FESTIVALS.map((festival) => (
          <div key={festival} className="space-y-2">
            <MediaUpload
              category="festival_greeting"
              title={festival}
              value={mediaByFestival[festival]}
              onChange={(media) => setMediaByFestival((prev) => ({ ...prev, [festival]: media }))}
              label={festival}
            />
            {mediaByFestival[festival] && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSend(festival)}
                disabled={sendState[festival] === "sending"}
              >
                <Send className="size-3.5" />
                {sendState[festival] === "sent"
                  ? "Sent!"
                  : sendState[festival] === "sending"
                    ? "Sending..."
                    : "Send now"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
