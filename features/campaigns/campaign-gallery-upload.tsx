"use client";

import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUpload } from "@/features/media/media-upload";
import type { NotificationMedia } from "@/types/db";

interface CampaignGalleryUploadProps {
  value: NotificationMedia[];
  onChange: (images: NotificationMedia[]) => void;
  label: string;
  hint?: string;
  addLabel: string;
  max?: number;
}

/**
 * Optional gallery for a donation campaign's public page — before/after
 * renovation shots, festival or annadanam photos.
 *
 * Wraps the existing single-image MediaUpload once per added image rather
 * than reimplementing upload, progress, validation, or ImageKit handling;
 * this component only owns ordering and removal. Array order is the display
 * order the public page uses, which is why the arrows exist instead of a
 * drag library.
 */
export function CampaignGalleryUpload({
  value,
  onChange,
  label,
  hint,
  addLabel,
  max = 12,
}: CampaignGalleryUploadProps) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      {value.map((image, index) => (
        <div key={image.id} className="flex items-center gap-3 rounded-xl border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
          <img src={image.imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{image.title ?? `Photo ${index + 1}`}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move earlier"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move later"
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((candidate) => candidate.id !== image.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      {value.length < max && (
        // `value={null}` keeps this slot permanently empty: each successful
        // upload is appended to the gallery and the slot resets, so one
        // control can add many images.
        <MediaUpload
          category="campaign_banner"
          value={null}
          onChange={(media) => {
            if (media) onChange([...value, media]);
          }}
          label={addLabel}
        />
      )}
    </div>
  );
}
