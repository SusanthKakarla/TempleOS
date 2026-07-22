import ImageKit from "imagekit";

export interface UploadedImage {
  fileId: string;
  url: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string;
}

let client: ImageKit | null = null;

function getClient(): ImageKit {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit credentials are not configured");
  }
  client ??= new ImageKit({ publicKey, privateKey, urlEndpoint });
  return client;
}

/** Uploads an in-memory image buffer — no temp files, matches this app's stateless-request model. */
export async function uploadImage(buffer: Buffer, folder: string, fileName: string): Promise<UploadedImage> {
  const result = await getClient().upload({ file: buffer, fileName, folder, useUniqueFileName: true });
  return {
    fileId: result.fileId,
    url: result.url,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.size,
    format: result.fileType,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  await getClient().deleteFile(fileId);
}

/**
 * Builds a resized, compressed delivery URL so Meta fetches a small asset
 * regardless of the original upload's size — this is the brief's "image
 * compression" ask, done via ImageKit's URL transforms instead of a
 * separate image library. Pure string manipulation (ImageKit's transforms
 * are just a `tr=` query param) rather than going through the SDK client,
 * so a delivery-time send never fails just because credentials are missing —
 * it falls back to the original, already-public upload URL.
 */
export function buildWhatsAppImageUrl(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-1200,q-80`;
}
