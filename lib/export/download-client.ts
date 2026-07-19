"use client";

/**
 * Triggers a browser file download from a fetch Response — used for
 * "Export Selected" (a POST, so a plain `<a href>` won't work). Reads the
 * server's `Content-Disposition` filename when present, falling back
 * otherwise.
 */
export async function downloadFromResponse(response: Response, fallbackFilename: string): Promise<void> {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
