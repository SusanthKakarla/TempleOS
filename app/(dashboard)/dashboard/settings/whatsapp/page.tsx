import { redirect } from "next/navigation";

/**
 * WhatsApp connection management now lives directly on /dashboard/settings.
 * This route is kept only so old bookmarks and in-flight Embedded Signup
 * handoff tokens (minted before this redirect existed) still land somewhere
 * that can finish the connection — the query string is forwarded as-is so
 * the settings page's own whatsapp_connect_token/whatsapp_connect_error
 * handling picks up where this page would have.
 */
export default async function WhatsAppSettingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const queryString = query.toString();
  redirect(`/dashboard/settings${queryString ? `?${queryString}` : ""}`);
}
