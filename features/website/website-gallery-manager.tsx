"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { checkImageFile, uploadWithProgress } from "@/features/media/upload-media-file";

/** Only what the grid renders — keeps this usable with either the media row or the public-site projection. */
export interface GalleryPhoto {
  id: string;
  imageUrl: string;
  title: string | null;
}

interface UploadState {
  total: number;
  done: number;
  percent: number;
}

/**
 * The public website's photo gallery.
 *
 * No join table and no ordering column: a gallery photo simply IS a
 * notification_media row with category `temple_gallery`, which is exactly
 * what the public /gallery page queries. Uploading here therefore publishes
 * immediately, and deleting removes it from the site — there is no second
 * copy to keep in step.
 *
 * Uploads run one after another so a slow connection shows steady progress
 * and one rejected file can't take the rest of the batch down. The whole
 * selection is accepted at once because a temple has a folder of photographs,
 * not one.
 */
export function WebsiteGalleryManager({ images }: { images: GalleryPhoto[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || upload) return;

    const problems: string[] = [];
    setErrors([]);
    setUpload({ total: files.length, done: 0, percent: 0 });

    for (const [index, file] of files.entries()) {
      setUpload({ total: files.length, done: index, percent: 0 });

      const check = await checkImageFile(file);
      if (check.error) {
        problems.push(`${file.name}: ${check.error}`);
        setErrors([...problems]);
        continue;
      }

      try {
        await uploadWithProgress(file, "temple_gallery", file.name, (percent) =>
          setUpload({ total: files.length, done: index, percent }),
        );
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
        setErrors([...problems]);
      }
    }

    setUpload(null);
    // The list is server-rendered, so a refresh is what shows the new photos —
    // and it is also what confirms they really persisted.
    router.refresh();
    if (problems.length === 0) toast.success(`${files.length} photo${files.length === 1 ? "" : "s"} added.`);
  }

  async function handleRemove(image: GalleryPhoto) {
    setRemoving(image.id);
    try {
      const response = await fetch(`/api/media/${image.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove the photo.");
      toast.success("Photo removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the photo.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Gallery photos</p>
        <p className="text-xs text-muted-foreground">
          Shown on your website&apos;s Gallery page and as a preview on the home page. Select several at once.
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="group relative overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
              <img
                src={image.imageUrl}
                alt={image.title ?? ""}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={`Remove ${image.title ?? "photo"}`}
                disabled={removing === image.id}
                onClick={() => handleRemove(image)}
                className="absolute top-1.5 right-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                {removing === image.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div
        role="button"
        tabIndex={upload ? -1 : 0}
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
          if (!upload) setDragging(true);
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
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP · up to 5MB each</p>
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
