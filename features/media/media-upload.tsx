"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { NotificationMedia, NotificationMediaCategory } from "@/types/db";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DIMENSION = 800;

interface MediaUploadProps {
  category: NotificationMediaCategory;
  title?: string;
  value: NotificationMedia | null;
  onChange: (media: NotificationMedia | null) => void;
  label: string;
  hint?: string;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function uploadWithProgress(
  file: File,
  category: NotificationMediaCategory,
  title: string | undefined,
  onProgress: (percent: number) => void,
): Promise<NotificationMedia> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (title) formData.append("title", title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { media?: NotificationMedia; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && body.media) {
          resolve(body.media);
        } else {
          reject(new Error(body.error ?? "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export function MediaUpload({ category, title, value, onChange, label, hint }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are supported.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File must be 5MB or smaller.");
      return;
    }
    const dimensions = await readImageDimensions(file);
    if (dimensions && (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION)) {
      setError(`Image is smaller than the recommended ${MIN_DIMENSION}×${MIN_DIMENSION} minimum — it will still be uploaded.`);
    }

    const previous = value;
    setUploading(true);
    setProgress(0);
    try {
      const media = await uploadWithProgress(file, category, title, setProgress);
      onChange(media);
      if (previous) {
        await fetch(`/api/media/${previous.id}`, { method: "DELETE" }).catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!value) return;
    setError(null);
    await fetch(`/api/media/${value.id}`, { method: "DELETE" }).catch(() => undefined);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {value ? (
        <div className="flex items-center gap-3 rounded-2xl border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local/optimizable asset */}
          <img src={value.imageUrl} alt={value.title ?? label} className="size-16 rounded-lg object-cover" />
          <div className="flex-1 text-xs text-muted-foreground">
            {value.width && value.height ? `${value.width}×${value.height} · ` : ""}
            {(value.fileSize / 1024).toFixed(0)} KB
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            Replace
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleRemove} disabled={uploading}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Drag & drop</span> or click to browse
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP · up to 5MB</p>
        </div>
      )}

      {uploading && <Progress value={progress} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
