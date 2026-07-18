import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { MockProvisionTempleError, poolEnd } = vi.hoisted(() => ({
  MockProvisionTempleError: class MockProvisionTempleError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 409 | 500,
      public readonly code: "VALIDATION_ERROR" | "PROVISIONING_CONFLICT" | "PROVISIONING_FAILED",
      public readonly field?: string,
    ) {
      super(message);
      this.name = "ProvisionTempleError";
    }
  },
  poolEnd: vi.fn(),
}));

vi.mock("@/lib/provisioning/temples", () => ({
  parseProvisionTempleInput: vi.fn(),
  provisionTemple: vi.fn(),
  ProvisionTempleError: MockProvisionTempleError,
}));

vi.mock("@/lib/db/pool", () => ({
  getPool: vi.fn(() => ({
    end: poolEnd,
  })),
}));

import { getPool } from "@/lib/db/pool";
import {
  parseProvisionTempleInput,
  provisionTemple,
  ProvisionTempleError,
} from "@/lib/provisioning/temples";
import {
  buildProvisionTempleActor,
  buildProvisionTempleRawInput,
  parseCliArgs,
  runProvisionTempleCli,
} from "./provision-temple.mts";

const canonicalInput = {
  tenant: {
    name: "Sri Venkateswara Temple",
    slug: "sv-temple",
    defaultContactPhone: "+917995362200",
    address: "123 Temple Street",
    timezone: "Asia/Kolkata",
  },
  domain: {
    subdomain: "sv-temple",
    hostname: "sv-temple.trytempleos.com",
  },
  firstMember: {
    phoneNumber: "+918886655443",
    displayName: "Temple Admin",
    roles: ["admin", "priest"],
  },
  whatsappAccount: {
    phoneNumber: "+919876543210",
    metaPhoneNumberId: "meta-secret-id",
    metaBusinessAccountId: "business-secret-id",
  },
};

const actor = {
  type: "super_admin" as const,
  superAdminId: "super-admin-1",
  phoneNumber: "+14155550100",
  displayName: "Root Admin",
};

const provisionedTemple = {
  tenant: {
    id: "tenant-1",
    slug: "sv-temple",
    name: "Sri Venkateswara Temple",
  },
  domain: {
    id: "domain-1",
    tenantId: "tenant-1",
    hostname: "sv-temple.trytempleos.com",
  },
  firstMember: {
    id: "membership-1",
    tenantId: "tenant-1",
    personId: "person-1",
    phoneNumber: "+918886655443",
    displayName: "Temple Admin",
    roles: ["admin", "priest"],
  },
  roles: ["admin", "priest"],
  whatsappAccount: {
    id: "whatsapp-1",
    tenantId: "tenant-1",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  poolEnd.mockResolvedValue(undefined);
  vi.mocked(parseProvisionTempleInput).mockReturnValue({ ok: true, data: canonicalInput } as never);
  vi.mocked(provisionTemple).mockResolvedValue(provisionedTemple as never);
});

describe("provision temple CLI input mapping", () => {
  it("maps flags into raw canonical provisioning input and actor", () => {
    const args = parseCliArgs([
      "--tenant-name",
      "Sri Venkateswara Temple",
      "--tenant-slug",
      "sv-temple",
      "--contact-phone",
      "7995362200",
      "--address",
      "123 Temple Street",
      "--timezone",
      "Asia/Kolkata",
      "--subdomain",
      "sv-temple",
      "--first-member-phone",
      "8886655443",
      "--first-member-name",
      "Temple Admin",
      "--role",
      "admin",
      "--role",
      "priest",
      "--whatsapp-phone",
      "9876543210",
      "--meta-phone-number-id",
      "meta-secret-id",
      "--meta-business-account-id",
      "business-secret-id",
      "--actor-super-admin-id",
      "super-admin-1",
      "--actor-phone",
      "+14155550100",
      "--actor-name",
      "Root Admin",
    ]);

    expect(buildProvisionTempleRawInput(args, {})).toEqual({
      tenant: {
        name: "Sri Venkateswara Temple",
        slug: "sv-temple",
        defaultContactPhone: "7995362200",
        address: "123 Temple Street",
        timezone: "Asia/Kolkata",
      },
      domain: {
        subdomain: "sv-temple",
      },
      firstMember: {
        phoneNumber: "8886655443",
        displayName: "Temple Admin",
        roles: ["admin", "priest"],
      },
      whatsappAccount: {
        phoneNumber: "9876543210",
        metaPhoneNumberId: "meta-secret-id",
        metaBusinessAccountId: "business-secret-id",
      },
    });
    expect(buildProvisionTempleActor(args, {})).toEqual(actor);
  });

  it("uses environment fallbacks, comma-separated roles, default admin, and WhatsApp omission", () => {
    const env = {
      TEMPLE_NAME: "Env Temple",
      TEMPLE_SLUG: "env-temple",
      TEMPLE_SUBDOMAIN: "env-temple",
      TEMPLE_TIMEZONE: "America/Los_Angeles",
      FIRST_MEMBER_PHONE: "8886655443",
      FIRST_MEMBER_DISPLAY_NAME: "Env Admin",
      FIRST_MEMBER_ROLES: "admin, volunteer",
      SUPER_ADMIN_ID: "super-admin-1",
      SUPER_ADMIN_PHONE_NUMBER: "+14155550100",
      SUPER_ADMIN_DISPLAY_NAME: "Root Admin",
    };

    const raw = buildProvisionTempleRawInput(parseCliArgs([]), env);
    expect(raw).toMatchObject({
      tenant: {
        name: "Env Temple",
        slug: "env-temple",
        timezone: "America/Los_Angeles",
      },
      domain: {
        subdomain: "env-temple",
      },
      firstMember: {
        phoneNumber: "8886655443",
        displayName: "Env Admin",
        roles: ["admin", "volunteer"],
      },
    });
    expect(raw).not.toHaveProperty("whatsappAccount");
    expect(buildProvisionTempleActor(parseCliArgs([]), env)).toEqual(actor);

    expect(buildProvisionTempleRawInput(parseCliArgs([]), { ...env, FIRST_MEMBER_ROLES: "" }).firstMember.roles).toEqual([
      "admin",
    ]);
  });

  it("treats explicit blank flags as authoritative instead of falling back to env", () => {
    const raw = buildProvisionTempleRawInput(
      parseCliArgs(["--tenant-name", "", "--tenant-slug", "flag-slug", "--subdomain", "flag-subdomain"]),
      {
        TEMPLE_NAME: "Stale Env Temple",
        TEMPLE_SLUG: "stale-env",
        TEMPLE_SUBDOMAIN: "stale-env",
        TEMPLE_TIMEZONE: "Asia/Kolkata",
        FIRST_MEMBER_PHONE: "8886655443",
        FIRST_MEMBER_DISPLAY_NAME: "Env Admin",
      },
    );

    expect(raw.tenant.name).toBe("");
    expect(raw.tenant.slug).toBe("flag-slug");
    expect(raw.domain.subdomain).toBe("flag-subdomain");
  });
});

describe("provision temple CLI execution", () => {
  it("calls canonical parser and service, prints safe success output, and closes the pool", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(0);
    expect(parseProvisionTempleInput).toHaveBeenCalledOnce();
    expect(provisionTemple).toHaveBeenCalledWith(canonicalInput, actor);
    expect(stdout.join("\n")).toContain("tenant-1");
    expect(stdout.join("\n")).toContain("sv-temple");
    expect(stdout.join("\n")).toContain("sv-temple.trytempleos.com");
    expect(stdout.join("\n")).toContain("+918886655443");
    expect(stdout.join("\n")).toContain("admin, priest");
    expect(stdout.join("\n")).toContain("linked");
    expect(stdout.join("\n")).not.toContain("meta-secret-id");
    expect(stdout.join("\n")).not.toContain("business-secret-id");
    expect(stderr).toEqual([]);
    expect(getPool).toHaveBeenCalled();
    expect(poolEnd).toHaveBeenCalledOnce();
  });

  it("rejects partial WhatsApp input before service mutation without leaking supplied Meta IDs", async () => {
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
        "--whatsapp-phone",
        "9876543210",
        "--meta-phone-number-id",
        "meta-secret-id",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
    expect(stderr.join("\n")).toContain("whatsappAccount");
    expect(stderr.join("\n")).not.toContain("meta-secret-id");
    expect(poolEnd).not.toHaveBeenCalled();
  });

  it("rejects unknown flags with usage before service mutation", async () => {
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      ["--first-member-phne", "8886655443"],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
    expect(stderr.join("\n")).toContain("Unknown flag --first-member-phne");
    expect(stderr.join("\n")).toContain("Usage: npm run provision:temple");
    expect(poolEnd).not.toHaveBeenCalled();
  });

  it("prints actor usage when required actor fields are missing", async () => {
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
      ],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
    expect(stderr.join("\n")).toContain("actor.superAdminId");
    expect(stderr.join("\n")).toContain("--actor-super-admin-id");
    expect(stderr.join("\n")).toContain("SUPER_ADMIN_ID");
    expect(poolEnd).not.toHaveBeenCalled();
  });

  it("prints validation paths without raw input values", async () => {
    vi.mocked(parseProvisionTempleInput).mockReturnValueOnce({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [
        { path: ["tenant", "name"], message: "Invalid field value." },
        { path: ["firstMember", "phoneNumber"], message: "Enter a valid phone number." },
      ],
    } as never);
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Bad Secret Temple",
        "--tenant-slug",
        "bad",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "bad",
        "--first-member-phone",
        "bad-secret-phone",
        "--first-member-name",
        "Admin",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(provisionTemple).not.toHaveBeenCalled();
    expect(stderr.join("\n")).toContain("tenant.name");
    expect(stderr.join("\n")).toContain("firstMember.phoneNumber");
    expect(stderr.join("\n")).not.toContain("Bad Secret Temple");
    expect(stderr.join("\n")).not.toContain("bad-secret-phone");
  });

  it("prints stable conflict fields without stack traces or SQL constraints", async () => {
    vi.mocked(provisionTemple).mockRejectedValueOnce(
      new ProvisionTempleError(
        "duplicate key value violates unique constraint tenant_domains_hostname_key",
        409,
        "PROVISIONING_CONFLICT",
        "domain.hostname",
      ),
    );
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(stderr.join("\n")).toContain("domain.hostname");
    expect(stderr.join("\n")).not.toContain("tenant_domains_hostname_key");
    expect(stderr.join("\n")).not.toContain("ProvisionTempleError");
    expect(poolEnd).toHaveBeenCalledOnce();
  });

  it("prints stable failure output without service details and still closes the pool", async () => {
    vi.mocked(provisionTemple).mockRejectedValueOnce(
      new ProvisionTempleError(
        "connection failed for postgresql://secret@localhost with meta-secret-id",
        500,
        "PROVISIONING_FAILED",
      ),
    );
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: vi.fn(), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(1);
    expect(stderr.join("\n")).toBe("Temple provisioning failed.");
    expect(stderr.join("\n")).not.toContain("postgresql://secret");
    expect(stderr.join("\n")).not.toContain("meta-secret-id");
    expect(stderr.join("\n")).not.toContain("ProvisionTempleError");
    expect(poolEnd).toHaveBeenCalledOnce();
  });

  it("preserves successful output when pool cleanup fails", async () => {
    poolEnd.mockRejectedValueOnce(new Error("pool cleanup failed"));
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runProvisionTempleCli(
      [
        "--tenant-name",
        "Sri Venkateswara Temple",
        "--tenant-slug",
        "sv-temple",
        "--timezone",
        "Asia/Kolkata",
        "--subdomain",
        "sv-temple",
        "--first-member-phone",
        "8886655443",
        "--first-member-name",
        "Temple Admin",
        "--actor-super-admin-id",
        "super-admin-1",
        "--actor-phone",
        "+14155550100",
        "--actor-name",
        "Root Admin",
      ],
      {},
      { stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line) },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("Temple provisioned.");
    expect(stderr).toEqual([]);
  });
});

describe("provision temple CLI static guardrails", () => {
  it("exposes provision:temple as a tsx script", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["provision:temple"]).toBe("tsx scripts/provision-temple.mts");
  });

  it("keeps the CLI on the canonical provisioning path", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/provision-temple.mts"), "utf8");

    expect(source).toMatch(/@\/lib\/provisioning\/temples/);
    expect(source).toMatch(/parseProvisionTempleInput/);
    expect(source).toMatch(/provisionTemple/);
    expect(source).not.toMatch(/getPilotTenant|admin_users|admin-users|upsertAdminUser/i);
    expect(source).not.toMatch(/@\/lib\/auth\/tenant-admin|requireTenantAdminSession|getSessionAdmin/i);
    expect(source).not.toMatch(/createTenantForSuperAdmin|createTenantDomainForSuperAdmin|createTenantMembershipForProvisioning|linkWhatsAppAccountForProvisioning/i);
    expect(source).not.toMatch(/insert\s+into\s+(tenants|tenant_domains|tenant_memberships|tenant_membership_roles|whatsapp_accounts)/i);
  });
});
