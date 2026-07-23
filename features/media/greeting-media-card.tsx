"use client";

import { useState } from "react";
import { MediaUpload } from "./media-upload";
import type { NotificationMedia, NotificationType } from "@/types/db";

interface GreetingSlot {
  notificationType: NotificationType;
  label: string;
  hint: string;
  media: NotificationMedia | null;
}

interface GreetingMediaCardProps {
  birthday: NotificationMedia | null;
  anniversary: NotificationMedia | null;
  donation: NotificationMedia | null;
}

async function linkMedia(notificationType: NotificationType, mediaId: string) {
  await fetch("/api/notification-media/link", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationType, mediaId }),
  });
}

export function GreetingMediaCard({ birthday, anniversary, donation }: GreetingMediaCardProps) {
  const [slots, setSlots] = useState<GreetingSlot[]>([
    {
      notificationType: "birthday_devotee",
      label: "Birthday greeting image",
      hint: "Sent with every automated birthday wish.",
      media: birthday,
    },
    {
      notificationType: "anniversary_devotee",
      label: "Anniversary greeting image",
      hint: "Sent with every automated wedding anniversary wish.",
      media: anniversary,
    },
    {
      notificationType: "donation_thank_you",
      label: "Donation thank-you image",
      hint: "Sent with the thank-you message after a donation is recorded.",
      media: donation,
    },
  ]);

  async function handleChange(notificationType: NotificationType, media: NotificationMedia | null) {
    setSlots((prev) => prev.map((slot) => (slot.notificationType === notificationType ? { ...slot, media } : slot)));
    if (media) {
      await linkMedia(notificationType, media.id);
    }
  }

  return (
    <div className="glass-card space-y-5 rounded-2xl p-4">
      <div>
        <p className="text-sm font-medium">Greeting images</p>
        <p className="text-xs text-muted-foreground">Reusable images attached to automated WhatsApp greetings.</p>
      </div>
      {slots.map((slot) => (
        <MediaUpload
          key={slot.notificationType}
          category={
            slot.notificationType === "birthday_devotee"
              ? "birthday_greeting"
              : slot.notificationType === "anniversary_devotee"
                ? "anniversary_greeting"
                : "donation_thank_you"
          }
          value={slot.media}
          onChange={(media) => handleChange(slot.notificationType, media)}
          label={slot.label}
          hint={slot.hint}
        />
      ))}
    </div>
  );
}
