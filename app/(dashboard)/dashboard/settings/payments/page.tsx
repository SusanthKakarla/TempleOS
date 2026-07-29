import { redirect } from "next/navigation";

/**
 * Payment provider management now lives directly on /dashboard/settings.
 * This route is kept only so old bookmarks and in-flight Razorpay OAuth
 * callbacks (minted before this redirect existed) still land somewhere —
 * the query string is forwarded as-is so the settings page's own
 * razorpay_oauth_connected/razorpay_oauth_error handling picks up where
 * this page would have.
 */
export default async function PaymentSettingsRedirectPage({
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
