export interface TempleDetailEditFormState {
  name: string;
  defaultContactPhone: string;
  address: string;
  timezone: string;
}

export interface TempleDetailEditFormErrors {
  fieldErrors: Partial<Record<keyof TempleDetailEditFormState, string>>;
  formError?: string;
}

interface ApiValidationIssue {
  path: string[];
  message: string;
}

const fieldByPath: Record<string, keyof TempleDetailEditFormState> = {
  "tenant.name": "name",
  "tenant.defaultContactPhone": "defaultContactPhone",
  "tenant.address": "address",
  "tenant.timezone": "timezone",
};

export function buildUpdateTemplePayload(form: TempleDetailEditFormState) {
  return {
    tenant: {
      name: form.name.trim(),
      defaultContactPhone: nullableTrim(form.defaultContactPhone),
      address: nullableTrim(form.address),
      timezone: form.timezone.trim(),
    },
  };
}

export function formErrorsFromTempleUpdateApiError(body: unknown): TempleDetailEditFormErrors {
  if (!isRecord(body)) {
    return { fieldErrors: {}, formError: "Temple update failed." };
  }

  const fieldErrors: TempleDetailEditFormErrors["fieldErrors"] = {};
  let formError = typeof body.error === "string" ? body.error : "Temple update failed.";
  const errors = Array.isArray(body.errors) ? body.errors.filter(isValidationIssue) : [];

  for (const issue of errors) {
    const field = fieldByPath[issue.path.join(".")];
    if (field) {
      fieldErrors[field] = issue.message;
    } else {
      formError = issue.message;
    }
  }

  return { fieldErrors, formError };
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
