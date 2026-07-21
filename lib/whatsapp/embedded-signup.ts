import { GRAPH_API_VERSION } from "./graph-api";

interface GraphErrorResponse {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
}

type GraphResult<T> = ({ success: true } & T) | { success: false; error: string };
export type SimpleGraphResult =
  | { success: true }
  | { success: false; error: string; errorCode?: string };

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

export async function fetchWabaDetails(
  wabaId: string,
): Promise<GraphResult<{ businessName: string | null }>> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { success: false, error: "WhatsApp credentials are not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}?fields=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse & { name?: string };
    if (!response.ok) {
      return { success: false, error: json.error?.message ?? `HTTP ${response.status}` };
    }
    return { success: true, businessName: json.name ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error fetching WABA details" };
  }
}

export async function fetchPhoneNumberDetails(phoneNumberId: string): Promise<
  GraphResult<{
    displayPhoneNumber: string;
    verifiedName: string | null;
    codeVerificationStatus: string | null;
  }>
> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { success: false, error: "WhatsApp credentials are not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse & {
      display_phone_number?: string;
      verified_name?: string;
      code_verification_status?: string;
    };
    if (!response.ok) {
      return { success: false, error: json.error?.message ?? `HTTP ${response.status}` };
    }
    if (!json.display_phone_number) {
      return { success: false, error: "Meta did not return a display phone number" };
    }
    return {
      success: true,
      displayPhoneNumber: json.display_phone_number,
      verifiedName: json.verified_name ?? null,
      codeVerificationStatus: json.code_verification_status ?? null,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error fetching phone number details",
    };
  }
}

export async function subscribeWabaWebhooks(wabaId: string): Promise<SimpleGraphResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`;

  console.log("[whatsapp:subscribe] Received subscribe request", {
    wabaId,
    accessTokenExists: Boolean(accessToken),
    graphApiVersion: GRAPH_API_VERSION,
    url,
    method: "POST",
  });

  if (!accessToken) {
    console.error("[whatsapp:subscribe] Aborting — WHATSAPP_ACCESS_TOKEN is not set");
    return { success: false, error: "WhatsApp credentials are not configured" };
  }

  try {
    console.log(`[whatsapp:subscribe] Calling Graph API... POST /${wabaId}/subscribed_apps`);
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse & { success?: boolean };

    console.log("[whatsapp:subscribe] Graph API response", { status: response.status, body: json });

    if (!response.ok) {
      const errorCode = formatGraphErrorCode(json.error);
      console.error("[whatsapp:subscribe] Graph API returned an error", {
        status: response.status,
        message: json.error?.message,
        type: json.error?.type,
        code: json.error?.code,
        subcode: json.error?.error_subcode,
        fbtraceId: json.error?.fbtrace_id,
      });
      return { success: false, error: json.error?.message ?? `HTTP ${response.status}`, errorCode };
    }

    console.log("[whatsapp:subscribe] Subscribed successfully", { wabaId });
    return { success: true };
  } catch (err) {
    console.error("[whatsapp:subscribe] Request threw before a response was received", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, error: err instanceof Error ? err.message : "Unknown error subscribing webhooks" };
  }
}

/** Best-effort on disconnect — callers should proceed with disconnecting even if this fails. */
export async function unsubscribeWabaWebhooks(wabaId: string): Promise<SimpleGraphResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`;

  console.log("[whatsapp:unsubscribe] Received unsubscribe request", {
    wabaId,
    accessTokenExists: Boolean(accessToken),
    url,
    method: "DELETE",
  });

  if (!accessToken) {
    console.error("[whatsapp:unsubscribe] Aborting — WHATSAPP_ACCESS_TOKEN is not set");
    return { success: false, error: "WhatsApp credentials are not configured" };
  }

  try {
    const response = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse;

    console.log("[whatsapp:unsubscribe] Graph API response", { status: response.status, body: json });

    if (!response.ok) {
      const errorCode = formatGraphErrorCode(json.error);
      console.error("[whatsapp:unsubscribe] Graph API returned an error", {
        status: response.status,
        message: json.error?.message,
        code: json.error?.code,
        subcode: json.error?.error_subcode,
      });
      return { success: false, error: json.error?.message ?? `HTTP ${response.status}`, errorCode };
    }

    return { success: true };
  } catch (err) {
    console.error("[whatsapp:unsubscribe] Request threw before a response was received", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, error: err instanceof Error ? err.message : "Unknown error unsubscribing webhooks" };
  }
}

/** "(#<code>[/<subcode>]) <type>" — e.g. "(#200/2018001) OAuthException", matching Meta's own error-message convention. */
function formatGraphErrorCode(error: GraphErrorResponse["error"]): string | undefined {
  if (!error?.code) return undefined;
  const subcode = error.error_subcode ? `/${error.error_subcode}` : "";
  return `#${error.code}${subcode}${error.type ? ` ${error.type}` : ""}`;
}
