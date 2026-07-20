import { createSignedSessionToken, verifySignedSessionToken } from "@/lib/auth/session-token";

const HANDOFF_MAX_AGE_SECONDS = 60 * 10;
const RESULT_MAX_AGE_SECONDS = 60 * 2;

export interface OnboardingHandoffPayload {
  tenantId: string;
  membershipId: string;
  returnUrl: string;
  exp: number;
}

export interface OnboardingResultPayload {
  tenantId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  exp: number;
}

export function createHandoffToken(input: {
  tenantId: string;
  membershipId: string;
  returnUrl: string;
}): string {
  return createSignedSessionToken(input, HANDOFF_MAX_AGE_SECONDS);
}

export function verifyHandoffToken(token: string): OnboardingHandoffPayload | null {
  return verifySignedSessionToken(token, isOnboardingHandoffPayload);
}

export function createResultToken(input: {
  tenantId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
}): string {
  return createSignedSessionToken(input, RESULT_MAX_AGE_SECONDS);
}

export function verifyResultToken(token: string): OnboardingResultPayload | null {
  return verifySignedSessionToken(token, isOnboardingResultPayload);
}

function isOnboardingHandoffPayload(payload: unknown): payload is OnboardingHandoffPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantId" in payload &&
    "membershipId" in payload &&
    "returnUrl" in payload &&
    "exp" in payload &&
    typeof payload.tenantId === "string" &&
    typeof payload.membershipId === "string" &&
    typeof payload.returnUrl === "string" &&
    typeof payload.exp === "number"
  );
}

function isOnboardingResultPayload(payload: unknown): payload is OnboardingResultPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantId" in payload &&
    "code" in payload &&
    "wabaId" in payload &&
    "phoneNumberId" in payload &&
    "exp" in payload &&
    typeof payload.tenantId === "string" &&
    typeof payload.code === "string" &&
    typeof payload.wabaId === "string" &&
    typeof payload.phoneNumberId === "string" &&
    typeof payload.exp === "number"
  );
}
