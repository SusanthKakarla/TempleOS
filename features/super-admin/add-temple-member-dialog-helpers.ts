import type { RoleCode } from "@/types/db";

export type AddTempleMemberField = "displayName" | "phoneNumber" | "roles";

export interface AddTempleMemberFormState {
  displayName: string;
  phoneNumber: string;
  selectedRoles: RoleCode[];
}

export interface AddTempleMemberErrors {
  fieldErrors: Partial<Record<AddTempleMemberField, string>>;
  formError?: string;
}

interface ApiValidationIssue {
  path: string[];
  message: string;
}

export const ADD_TEMPLE_MEMBER_FALLBACK_ERROR = "Failed to add member.";

export function buildAddTempleMemberPayload(form: AddTempleMemberFormState) {
  return {
    displayName: form.displayName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    roles: form.selectedRoles,
  };
}

export function formErrorsFromAddTempleMemberApiError(body: unknown): AddTempleMemberErrors {
  if (!isRecord(body)) {
    return { fieldErrors: {}, formError: ADD_TEMPLE_MEMBER_FALLBACK_ERROR };
  }

  const fieldErrors: AddTempleMemberErrors["fieldErrors"] = {};
  let formError = typeof body.error === "string" ? body.error : ADD_TEMPLE_MEMBER_FALLBACK_ERROR;
  const errors = Array.isArray(body.errors) ? body.errors.filter(isValidationIssue) : [];

  for (const issue of errors) {
    const field = issue.path.join(".");
    if (isAddTempleMemberField(field)) {
      fieldErrors[field] = issue.message;
    } else {
      formError = issue.message;
    }
  }

  return { fieldErrors, formError };
}

function isAddTempleMemberField(value: string): value is AddTempleMemberField {
  return value === "displayName" || value === "phoneNumber" || value === "roles";
}

function isValidationIssue(value: unknown): value is ApiValidationIssue {
  return (
    isRecord(value) &&
    Array.isArray(value.path) &&
    value.path.every((part) => typeof part === "string") &&
    typeof value.message === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
