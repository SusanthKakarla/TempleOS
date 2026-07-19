import { describe, expect, it } from "vitest";
import {
  buildUpdateTemplePayload,
  formErrorsFromTempleUpdateApiError,
  type TempleDetailEditFormState,
} from "./temple-detail-edit-form-helpers";

const validForm: TempleDetailEditFormState = {
  name: "Updated Temple",
  defaultContactPhone: "+1 415 555 9999",
  address: "",
  timezone: "Asia/Kolkata",
};

describe("super-admin temple detail edit form helpers", () => {
  it("builds only the safe temple update payload", () => {
    expect(buildUpdateTemplePayload(validForm)).toEqual({
      tenant: {
        name: "Updated Temple",
        defaultContactPhone: "+1 415 555 9999",
        address: null,
        timezone: "Asia/Kolkata",
      },
    });
  });

  it("converts blank optional contact and address fields to null", () => {
    expect(
      buildUpdateTemplePayload({
        ...validForm,
        defaultContactPhone: " ",
        address: " ",
      }),
    ).toEqual({
      tenant: {
        name: "Updated Temple",
        defaultContactPhone: null,
        address: null,
        timezone: "Asia/Kolkata",
      },
    });
  });

  it("maps field-specific update API errors to form fields", () => {
    expect(
      formErrorsFromTempleUpdateApiError({
        code: "VALIDATION_ERROR",
        errors: [
          { path: ["tenant", "defaultContactPhone"], message: "Enter a valid phone number." },
          { path: ["tenant", "timezone"], message: "Timezone must be a valid IANA timezone" },
          { path: ["tenant", "slug"], message: "Field is not editable in this operation." },
        ],
      }),
    ).toEqual({
      fieldErrors: {
        defaultContactPhone: "Enter a valid phone number.",
        timezone: "Timezone must be a valid IANA timezone",
      },
      formError: "Field is not editable in this operation.",
    });
  });

  it("falls back to a stable form error for unknown API failures", () => {
    expect(formErrorsFromTempleUpdateApiError({ code: "TEMPLE_UPDATE_FAILED" })).toEqual({
      fieldErrors: {},
      formError: "Temple update failed.",
    });
  });
});
