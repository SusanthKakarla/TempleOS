import { describe, expect, it } from "vitest";
import {
  buildAssignMemberRolesPayload,
  formErrorsFromMemberRoleApiError,
  type MemberRoleEditorState,
} from "./member-role-editor-helpers";

const form: MemberRoleEditorState = {
  selectedRoles: ["admin", "volunteer"],
};

describe("super-admin member role editor helpers", () => {
  it("builds only the role assignment payload", () => {
    expect(buildAssignMemberRolesPayload(form)).toEqual({
      roles: ["admin", "volunteer"],
    });
  });

  it("maps role validation API errors to the role editor", () => {
    expect(
      formErrorsFromMemberRoleApiError({
        code: "VALIDATION_ERROR",
        errors: [
          { path: ["roles"], message: "Unknown role code: owner" },
          { path: ["tenantId"], message: "Invalid tenant ID." },
        ],
      }),
    ).toEqual({
      fieldErrors: {
        roles: "Unknown role code: owner",
      },
      formError: "Invalid tenant ID.",
    });
  });

  it("falls back to a stable form error for unknown API failures", () => {
    expect(formErrorsFromMemberRoleApiError({ code: "ROLE_ASSIGNMENT_FAILED" })).toEqual({
      fieldErrors: {},
      formError: "Role assignment failed.",
    });
  });
});
