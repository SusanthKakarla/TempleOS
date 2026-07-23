import { GRAPH_API_VERSION } from "./graph-api";

interface GraphErrorResponse {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
}

type GraphResult<T> = ({ success: true } & T) | { success: false; error: string; errorCode?: string };
export type SimpleGraphResult =
  | { success: true }
  | { success: false; error: string; errorCode?: string };

/** "(#<code>[/<subcode>]) <type>" — e.g. "(#100/33) GraphMethodException", matching Meta's own error-message convention. */
function formatGraphErrorCode(error: GraphErrorResponse["error"]): string | undefined {
  if (!error?.code) return undefined;
  const subcode = error.error_subcode ? `/${error.error_subcode}` : "";
  return `#${error.code}${subcode}${error.type ? ` ${error.type}` : ""}`;
}

/**
 * Shared fetch + structured-log path for every Graph API call this module
 * makes (token/phone/WABA validation, subscribe/unsubscribe, verification).
 * Every call site gets identical logging so no failure mode is silent:
 * request (label, url, method, whether a token was present — never the
 * token itself), the raw response, and on failure Meta's full error object
 * (message, type, code, subcode, fbtrace_id).
 */
async function graphRequest<T extends Record<string, unknown> = Record<string, unknown>>(
  label: string,
  url: string,
  method: "GET" | "POST" | "DELETE",
  accessToken: string | undefined,
): Promise<{ ok: true; json: T } | { ok: false; error: string; errorCode?: string }> {
  console.log(`[whatsapp:${label}] Request`, { url, method, accessTokenExists: Boolean(accessToken) });

  if (!accessToken) {
    console.error(`[whatsapp:${label}] Aborting — WHATSAPP_ACCESS_TOKEN is not set`);
    return { ok: false, error: "WhatsApp credentials are not configured" };
  }

  try {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${accessToken}` } });
    const json = (await response.json().catch(() => ({}))) as T & GraphErrorResponse;

    console.log(`[whatsapp:${label}] Response`, { status: response.status, body: json });

    if (!response.ok) {
      const errorCode = formatGraphErrorCode(json.error);
      console.error(`[whatsapp:${label}] Graph API returned an error`, {
        status: response.status,
        message: json.error?.message,
        type: json.error?.type,
        code: json.error?.code,
        subcode: json.error?.error_subcode,
        fbtraceId: json.error?.fbtrace_id,
      });
      return { ok: false, error: json.error?.message ?? `HTTP ${response.status}`, errorCode };
    }

    return { ok: true, json };
  } catch (err) {
    console.error(`[whatsapp:${label}] Request threw before a response was received`, {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { ok: false, error: err instanceof Error ? err.message : `Unknown error during ${label}` };
  }
}

/**
 * Confirms the `code` Embedded Signup handed back to the client is a
 * legitimate Meta grant (defense against a forged/replayed code posted to
 * the callback route) — the exchanged token itself is discarded. TempleOS
 * is a Meta Tech Provider: every ongoing Graph API call for every connected
 * tenant uses the platform's own System User token (WHATSAPP_ACCESS_TOKEN),
 * never a per-tenant token, so nothing from this exchange is persisted.
 */
export async function exchangeCodeForConfirmation(code: string): Promise<SimpleGraphResult> {
  const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appId || !appSecret) {
    return { success: false, error: "WhatsApp Embedded Signup is not configured" };
  }

  try {
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("code", code);

    const response = await fetch(url, { method: "GET" });
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse;
    if (!response.ok) {
      return { success: false, error: json.error?.message ?? `HTTP ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error confirming Meta grant" };
  }
}

/**
 * Preflight check that the platform System User token (WHATSAPP_ACCESS_TOKEN)
 * is itself live before attempting any per-connection validation — a broken
 * or revoked platform token would otherwise surface as a confusing failure
 * on the phone/WABA checks below instead of pointing at the real cause.
 */
export async function validatePlatformAccessToken(): Promise<SimpleGraphResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const result = await graphRequest(
    "validate-token",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me`,
    "GET",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };
  return { success: true };
}

export async function fetchWabaDetails(
  wabaId: string,
): Promise<GraphResult<{ businessName: string | null }>> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const result = await graphRequest<{ name?: string }>(
    "validate-waba",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}?fields=name`,
    "GET",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };
  return { success: true, businessName: result.json.name ?? null };
}

export async function fetchPhoneNumberDetails(phoneNumberId: string): Promise<
  GraphResult<{
    displayPhoneNumber: string;
    verifiedName: string | null;
    codeVerificationStatus: string | null;
  }>
> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const result = await graphRequest<{
    display_phone_number?: string;
    verified_name?: string;
    code_verification_status?: string;
  }>(
    "validate-phone",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status`,
    "GET",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };
  if (!result.json.display_phone_number) {
    return { success: false, error: "Meta did not return a display phone number" };
  }
  return {
    success: true,
    displayPhoneNumber: result.json.display_phone_number,
    verifiedName: result.json.verified_name ?? null,
    codeVerificationStatus: result.json.code_verification_status ?? null,
  };
}

export async function subscribeWabaWebhooks(wabaId: string): Promise<SimpleGraphResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const result = await graphRequest(
    "subscribe",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`,
    "POST",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };
  return { success: true };
}

/**
 * GET /{waba-id}/subscribed_apps returns every app currently subscribed to
 * this WABA's webhook events. subscribeWabaWebhooks' 200 response only means
 * Meta *accepted* the subscribe call — this independently confirms our own
 * app actually appears in the list, matching Step 8 of the "don't trust a
 * bare success flag" requirement.
 */
export async function verifyWabaSubscription(wabaId: string): Promise<GraphResult<{ subscribed: boolean }>> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  const result = await graphRequest<{ data?: Array<{ whatsapp_business_api_data?: { id?: string } }> }>(
    "verify-subscription",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`,
    "GET",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };

  const entries = result.json.data ?? [];
  const subscribed = appId
    ? entries.some((entry) => entry.whatsapp_business_api_data?.id === appId)
    : entries.length > 0;

  console.log("[whatsapp:verify-subscription] Subscription check", { wabaId, appId, subscribed, entryCount: entries.length });

  return { success: true, subscribed };
}

/** Best-effort on disconnect — callers should proceed with disconnecting even if this fails. */
export async function unsubscribeWabaWebhooks(wabaId: string): Promise<SimpleGraphResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const result = await graphRequest(
    "unsubscribe",
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`,
    "DELETE",
    accessToken,
  );
  if (!result.ok) return { success: false, error: result.error, errorCode: result.errorCode };
  return { success: true };
}
