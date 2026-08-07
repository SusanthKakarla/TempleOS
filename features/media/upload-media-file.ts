import type { NotificationMedia, NotificationMediaCategory } from "@/types/db";

/**
 * The upload primitives shared by the single-image MediaUpload and the
 * multi-image CampaignGalleryUpload. Extracted so a second uploader can
 * never drift from the first on what a valid image is or how it reaches
 * /api/media/upload — the rules live here once.
 */

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MIN_DIMENSION = 800;

export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
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

export interface ImageFileCheck {
  /** Set when the file must not be uploaded at all. */
  error?: string;
  /** Set when the file uploads anyway but the admin should know something (e.g. below the recommended size). */
  warning?: string;
}

/** Type/size are hard rejections; small dimensions are only a warning — the same rule the single-image uploader has always applied. */
export async function checkImageFile(file: File): Promise<ImageFileCheck> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "Only JPG, PNG, and WEBP images are supported." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be 5MB or smaller." };
  }
  const dimensions = await readImageDimensions(file);
  if (dimensions && (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION)) {
    return { warning: `Image is smaller than the recommended ${MIN_DIMENSION}×${MIN_DIMENSION} minimum — it will still be uploaded.` };
  }
  return {};
}

export function uploadWithProgress(
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
