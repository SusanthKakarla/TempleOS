import type { RoleCode } from "@/types/db";

export interface MemberRoleEditorState {
  selectedRoles: RoleCode[];
}

export interface MemberRoleEditorErrors {
  fieldErrors: Partial<Record<"roles", string>>;
  formError?: string;
}

interface ApiValidationIssue {
  path: string[];
  message: string;
}

export function buildAssignMemberRolesPayload(form: MemberRoleEditorState) {
  return {
    roles: form.selectedRoles,
  };
}

export function formErrorsFromMemberRoleApiError(body: unknown): MemberRoleEditorErrors {
  if (!isRecord(body)) {
    return { fieldErrors: {}, formError: "Role assignment failed." };
  }

  const fieldErrors: MemberRoleEditorErrors["fieldErrors"] = {};
  let formError = typeof body.error === "string" ? body.error : "Role assignment failed.";
  const errors = Array.isArray(body.errors) ? body.errors.filter(isValidationIssue) : [];

  for (const issue of errors) {
    if (issue.path.join(".") === "roles") {
      fieldErrors.roles = issue.message;
    } else {
      formError = issue.message;
    }
  }

  return { fieldErrors, formError };
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
