import { describe, expect, it } from "vitest";
import {
  ADD_TEMPLE_MEMBER_FALLBACK_ERROR,
  buildAddTempleMemberPayload,
  formErrorsFromAddTempleMemberApiError,
} from "./add-temple-member-dialog-helpers";

describe("add temple member payload", () => {
  it("trims the typed fields", () => {
    expect(
      buildAddTempleMemberPayload({
        displayName: "  Temple Admin  ",
        phoneNumber: " 8886655443 ",
        selectedRoles: ["admin"],
      }),
    ).toEqual({
      displayName: "Temple Admin",
      phoneNumber: "8886655443",
      roles: ["admin"],
    });
  });

  it("sends every selected role", () => {
    expect(
      buildAddTempleMemberPayload({
        displayName: "Temple Admin",
        phoneNumber: "8886655443",
        selectedRoles: ["admin", "priest"],
      }),
    ).toMatchObject({ roles: ["admin", "priest"] });
  });
});

describe("add temple member error mapping", () => {
  it("routes validation issues to their fields", () => {
    expect(
      formErrorsFromAddTempleMemberApiError({
        error: "Invalid add member request",
        errors: [
          { path: ["phoneNumber"], message: "Enter a valid phone number." },
          { path: ["roles"], message: "At least one role is required." },
        ],
      }),
    ).toEqual({
      fieldErrors: {
        phoneNumber: "Enter a valid phone number.",
        roles: "At least one role is required.",
      },
      formError: "Invalid add member request",
    });
  });

  it("surfaces a conflict as a form-level message", () => {
    expect(
      formErrorsFromAddTempleMemberApiError({
        error: "This person is already a member of this temple.",
        code: "ALREADY_MEMBER",
      }),
    ).toEqual({
      fieldErrors: {},
      formError: "This person is already a member of this temple.",
    });
  });

  it("falls back when the body is unusable", () => {
    expect(formErrorsFromAddTempleMemberApiError(null)).toEqual({
      fieldErrors: {},
      formError: ADD_TEMPLE_MEMBER_FALLBACK_ERROR,
    });
  });
});
