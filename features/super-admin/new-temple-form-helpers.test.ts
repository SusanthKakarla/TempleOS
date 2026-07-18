import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/types/db";
import {
  buildProvisionTemplePayload,
  DEFAULT_NEW_TEMPLE_FORM_STATE,
  formErrorsFromApiError,
  fullHostnamePreview,
  normalizeSubdomainInput,
  validateNewTempleForm,
} from "./new-temple-form-helpers";

describe("new temple form helpers", () => {
  it("normalizes subdomains and builds the hostname preview", () => {
    expect(normalizeSubdomainInput(" SV Temple ")).toBe("sv-temple");
    expect(normalizeSubdomainInput("sri__venkateswara!!temple")).toBe("sri-venkateswara-temple");
    expect(fullHostnamePreview(" SV Temple ")).toBe("sv-temple.trytempleos.com");
  });

  it("blocks reserved and invalid subdomains before submission", () => {
    expect(validateNewTempleForm({ ...validState(), subdomain: "www" })).toMatchObject({
      ok: false,
      fieldErrors: { subdomain: "This subdomain is reserved." },
    });
    expect(validateNewTempleForm({ ...validState(), subdomain: "" })).toMatchObject({
      ok: false,
      fieldErrors: { subdomain: "Subdomain is required." },
    });
    expect(validateNewTempleForm({ ...validState(), subdomain: "localhost" })).toMatchObject({
      ok: false,
      fieldErrors: { subdomain: "This subdomain is reserved." },
    });
    expect(validateNewTempleForm({ ...validState(), subdomain: "trytempleos.com" })).toMatchObject({
      ok: false,
      fieldErrors: { subdomain: "This subdomain is reserved." },
    });
  });

  it("blocks reserved tenant slugs before submission", () => {
    expect(validateNewTempleForm({ ...validState(), tenantSlug: "admin" })).toMatchObject({
      ok: false,
      fieldErrors: { tenantSlug: "This tenant slug is reserved." },
    });
  });

  it("omits optional WhatsApp payload when the optional section is blank", () => {
    const result = buildProvisionTemplePayload(validState());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      tenant: {
        name: "Sri Venkateswara Temple",
        slug: "sv-temple",
        defaultContactPhone: "+1 415 555 2671",
        address: "1 Temple Way",
        timezone: "America/Los_Angeles",
      },
      domain: {
        subdomain: "svtemple",
      },
      firstMember: {
        phoneNumber: "+1 415 555 2672",
        displayName: "Temple Admin",
        roles: ["admin", "priest"],
      },
    });
  });

  it("requires all optional WhatsApp fields together", () => {
    expect(
      buildProvisionTemplePayload({
        ...validState(),
        whatsappPhoneNumber: "+1 415 555 2673",
      }),
    ).toMatchObject({
      ok: false,
      sectionErrors: {
        whatsappAccount: "Provide WhatsApp phone, Meta phone number ID, and Meta business account ID together.",
      },
    });
  });

  it("preserves the default admin role even when state is missing it", () => {
    const result = buildProvisionTemplePayload({ ...validState(), firstMemberRoles: ["volunteer"] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.firstMember.roles).toEqual(["admin", "volunteer"]);
  });

  it("maps API validation and conflict errors to stable form errors", () => {
    expect(
      formErrorsFromApiError({
        code: "VALIDATION_ERROR",
        error: "Invalid provisioning request",
        errors: [{ path: ["domain", "subdomain"], message: "Subdomain is reserved." }],
      }),
    ).toMatchObject({
      fieldErrors: { subdomain: "Subdomain is reserved." },
    });

    expect(
      formErrorsFromApiError({
        code: "PROVISIONING_CONFLICT",
        error: "Temple provisioning conflicts with an existing record.",
        field: "whatsappAccount.metaPhoneNumberId",
      }),
    ).toMatchObject({
      fieldErrors: { metaPhoneNumberId: "Temple provisioning conflicts with an existing record." },
    });

    expect(
      formErrorsFromApiError({
        code: "VALIDATION_ERROR",
        error: "Invalid provisioning request",
        errors: [],
      }),
    ).toMatchObject({
      sectionErrors: { form: "Invalid provisioning request." },
    });

    expect(
      formErrorsFromApiError({
        code: "PROVISIONING_CONFLICT",
        error: "Temple provisioning conflicts with an existing record.",
        field: "whatsappAccount.tenantId",
      }),
    ).toMatchObject({
      sectionErrors: { form: "Temple provisioning conflicts with an existing record." },
    });
  });
});

function validState() {
  return {
    ...DEFAULT_NEW_TEMPLE_FORM_STATE,
    templeName: "Sri Venkateswara Temple",
    tenantSlug: "sv-temple",
    subdomain: "svtemple",
    contactPhone: "+1 415 555 2671",
    address: "1 Temple Way",
    timezone: "America/Los_Angeles",
    firstMemberPhone: "+1 415 555 2672",
    firstMemberDisplayName: "Temple Admin",
    firstMemberRoles: ["admin", "priest"] satisfies RoleCode[],
  };
}
