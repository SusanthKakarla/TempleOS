"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { checkImageFile, uploadWithProgress } from "@/features/media/upload-media-file";
import type { NotificationMedia } from "@/types/db";

interface CampaignGalleryUploadProps {
  value: NotificationMedia[];
  onChange: (images: NotificationMedia[]) => void;
  label: string;
  hint?: string;
  addLabel: string;
  max?: number;
}

interface UploadState {
  total: number;
  done: number;
  percent: number;
}

/**
 * Optional gallery for a donation campaign's public page — before/after
 * renovation shots, festival or annadanam photos.
 *
 * Accepts a whole selection at once (multi-select in the file picker, or a
 * drag-and-drop of several files) because a temple documenting a renovation
 * has a folder of photos, not one. Validation and the actual upload come
 * from the same helpers the single-image MediaUpload uses, so the two can't
 * disagree about what a valid image is.
 *
 * Files upload one after another rather than in parallel: each one appends
 * to the gallery the moment it lands, so a slow connection shows steady
 * progress instead of nothing-then-everything, and one bad file can't take
 * the rest of the batch down with it. Array order is the public display
 * order, which is why the arrows exist instead of a drag library.
 */
export function CampaignGalleryUpload({
  value,
  onChange,
  label,
  hint,
  addLabel,
  max = 12,
}: CampaignGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const remaining = max - value.length;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  async function handleFiles(fileList: FileList | null) {
    const picked = Array.from(fileList ?? []);
    if (picked.length === 0 || upload) return;

    const problems: string[] = [];
    const files = picked.slice(0, Math.max(0, remaining));
    if (picked.length > files.length) {
      problems.push(`Only ${max} photos can be added — the last ${picked.length - files.length} were skipped.`);
    }

    // `value` is captured per iteration rather than read from the closure: the
    // parent's state hasn't re-rendered this component yet mid-batch, so
    // appending to a stale array would drop every image but the last.
    let gallery = value;
    setErrors(problems);
    setUpload({ total: files.length, done: 0, percent: 0 });

    for (const [index, file] of files.entries()) {
      setUpload({ total: files.length, done: index, percent: 0 });

      const check = await checkImageFile(file);
      if (check.error) {
        problems.push(`${file.name}: ${check.error}`);
        setErrors([...problems]);
        continue;
      }
      if (check.warning) {
        problems.push(`${file.name}: ${check.warning}`);
        setErrors([...problems]);
      }

      try {
        const media = await uploadWithProgress(file, "campaign_banner", file.name, (percent) =>
          setUpload({ total: files.length, done: index, percent }),
        );
        gallery = [...gallery, media];
        onChange(gallery);
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
        setErrors([...problems]);
      }
    }

    setUpload(null);
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
              disabled={Boolean(upload)}
              onClick={() => onChange(value.filter((candidate) => candidate.id !== image.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      {remaining > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{addLabel}</p>
          <div
            role="button"
            tabIndex={0}
            aria-disabled={Boolean(upload)}
            onClick={() => !upload && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!upload && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!upload) void handleFiles(event.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              upload ? "cursor-wait opacity-70" : "cursor-pointer"
            } ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
          >
            {upload ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {upload ? (
                `Uploading ${Math.min(upload.done + 1, upload.total)} of ${upload.total}...`
              ) : (
                <>
                  <span className="font-medium text-foreground">Drag &amp; drop</span> or click to select several photos
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WEBP · up to 5MB each · {remaining} {remaining === 1 ? "slot" : "slots"} left
            </p>
          </div>

          {upload && <Progress value={Math.round(((upload.done + upload.percent / 100) / upload.total) * 100)} />}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {errors.length > 0 && (
        <ul className="space-y-0.5">
          {errors.map((message) => (
            <li key={message} className="text-xs text-destructive">
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
