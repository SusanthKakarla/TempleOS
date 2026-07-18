import "./load-env.mts";
import { pathToFileURL } from "node:url";
import { getPool } from "@/lib/db/pool";
import {
  parseProvisionTempleInput,
  provisionTemple,
  ProvisionTempleError,
  type ProvisionTempleActor,
} from "@/lib/provisioning/temples";

type Env = Record<string, string | undefined>;
type CliOutput = {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

export type CliArgs = Map<string, string[]>;

const knownFlags = new Set([
  "tenant-name",
  "tenant-slug",
  "contact-phone",
  "address",
  "timezone",
  "subdomain",
  "first-member-phone",
  "first-member-name",
  "role",
  "roles",
  "whatsapp-phone",
  "meta-phone-number-id",
  "meta-business-account-id",
  "actor-super-admin-id",
  "actor-phone",
  "actor-name",
]);

class CliInputError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "CliInputError";
  }
}

const defaultOutput: CliOutput = {
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
};

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    if (!knownFlags.has(key)) {
      throw new CliInputError(key, `Unknown flag --${key}.`);
    }

    const next = argv[index + 1];
    const value = next && !next.startsWith("--") ? next : "";
    if (next && !next.startsWith("--")) index += 1;

    const values = args.get(key) ?? [];
    values.push(value);
    args.set(key, values);
  }

  return args;
}

export function buildProvisionTempleRawInput(args: CliArgs, env: Env) {
  const whatsappPhone = valueFor(args, env, "whatsapp-phone", "WHATSAPP_PHONE_NUMBER");
  const metaPhoneNumberId = valueFor(args, env, "meta-phone-number-id", "META_PHONE_NUMBER_ID");
  const metaBusinessAccountId = valueFor(args, env, "meta-business-account-id", "META_BUSINESS_ACCOUNT_ID");
  const whatsappValues = [whatsappPhone, metaPhoneNumberId, metaBusinessAccountId];
  const hasAnyWhatsAppValue = whatsappValues.some(Boolean);
  const hasAllWhatsAppValues = whatsappValues.every(Boolean);

  if (hasAnyWhatsAppValue && !hasAllWhatsAppValues) {
    throw new CliInputError(
      "whatsappAccount",
      "Provide whatsappAccount.phoneNumber, whatsappAccount.metaPhoneNumberId, and whatsappAccount.metaBusinessAccountId together.",
    );
  }

  const tenant: Record<string, string | null> = {
    name: valueFor(args, env, "tenant-name", "TEMPLE_NAME") ?? "",
    slug: valueFor(args, env, "tenant-slug", "TEMPLE_SLUG") ?? "",
    timezone: valueFor(args, env, "timezone", "TEMPLE_TIMEZONE") ?? "",
  };
  const contactPhone = valueFor(args, env, "contact-phone", "TEMPLE_CONTACT_PHONE");
  const address = valueFor(args, env, "address", "TEMPLE_ADDRESS");
  if (contactPhone !== undefined) tenant.defaultContactPhone = contactPhone || null;
  if (address !== undefined) tenant.address = address || null;

  return {
    tenant,
    domain: {
      subdomain: valueFor(args, env, "subdomain", "TEMPLE_SUBDOMAIN") ?? "",
    },
    firstMember: {
      phoneNumber: valueFor(args, env, "first-member-phone", "FIRST_MEMBER_PHONE") ?? "",
      displayName: valueFor(args, env, "first-member-name", "FIRST_MEMBER_DISPLAY_NAME") ?? "",
      roles: rolesFor(args, env),
    },
    ...(hasAllWhatsAppValues
      ? {
          whatsappAccount: {
            phoneNumber: whatsappPhone,
            metaPhoneNumberId,
            metaBusinessAccountId,
          },
        }
      : {}),
  };
}

export function buildProvisionTempleActor(args: CliArgs, env: Env): ProvisionTempleActor {
  const superAdminId = valueFor(args, env, "actor-super-admin-id", "SUPER_ADMIN_ID");
  const phoneNumber = valueFor(args, env, "actor-phone", "SUPER_ADMIN_PHONE_NUMBER");
  const displayName = valueFor(args, env, "actor-name", "SUPER_ADMIN_DISPLAY_NAME");

  if (!superAdminId) {
    throw new CliInputError("actor.superAdminId", "Super Admin actor ID is required.");
  }
  if (!phoneNumber) {
    throw new CliInputError("actor.phoneNumber", "Super Admin actor phone is required.");
  }
  if (!displayName) {
    throw new CliInputError("actor.displayName", "Super Admin actor name is required.");
  }

  return {
    type: "super_admin",
    superAdminId,
    phoneNumber,
    displayName,
  };
}

export async function runProvisionTempleCli(
  argv: string[] = process.argv.slice(2),
  env: Env = process.env,
  output: CliOutput = defaultOutput,
): Promise<number> {
  let poolUsed = false;
  try {
    const args = parseCliArgs(argv);
    const rawInput = buildProvisionTempleRawInput(args, env);
    const actor = buildProvisionTempleActor(args, env);
    const parsed = parseProvisionTempleInput(rawInput);

    if (!parsed.ok) {
      printValidationErrors(parsed.errors, output);
      return 1;
    }

    poolUsed = true;
    const result = await provisionTemple(parsed.data, actor);
    output.stdout("Temple provisioned.");
    output.stdout(`Tenant ID: ${result.tenant.id}`);
    output.stdout(`Tenant slug: ${result.tenant.slug}`);
    output.stdout(`Hostname: ${result.domain.hostname}`);
    output.stdout(`First member phone: ${parsed.data.firstMember.phoneNumber}`);
    output.stdout(`Assigned roles: ${result.roles.join(", ")}`);
    output.stdout(`WhatsApp linkage: ${result.whatsappAccount ? "linked" : "not linked"}`);
    return 0;
  } catch (err) {
    printCliError(err, output);
    return 1;
  } finally {
    if (poolUsed) {
      await getPool()
        .end()
        .catch(() => undefined);
    }
  }
}

function valueFor(args: CliArgs, env: Env, flag: string, envName: string): string | undefined {
  if (args.has(flag)) {
    return args.get(flag)?.at(-1)?.trim() ?? "";
  }

  const envValue = env[envName]?.trim();
  return envValue || undefined;
}

function rolesFor(args: CliArgs, env: Env): string[] {
  const roleValues = [...(args.get("role") ?? []), ...(args.get("roles") ?? [])];
  const envRoles = env.FIRST_MEMBER_ROLES ? [env.FIRST_MEMBER_ROLES] : [];
  const rawRoles = roleValues.length > 0 ? roleValues : envRoles;
  const roles = rawRoles.flatMap((value) =>
    value
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  );
  const uniqueRoles = roles.length > 0 ? dedupe(roles) : ["admin"];

  return uniqueRoles.includes("admin") ? uniqueRoles : ["admin", ...uniqueRoles];
}

function dedupe(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (!result.includes(value)) result.push(value);
  }
  return result;
}

function printValidationErrors(
  errors: Array<{ path: string[]; message: string }>,
  output: CliOutput,
): void {
  output.stderr("Invalid provisioning input:");
  for (const error of errors) {
    output.stderr(`- ${error.path.join(".")}: ${error.message}`);
  }
}

function printCliError(err: unknown, output: CliOutput): void {
  if (err instanceof CliInputError) {
    output.stderr(`Invalid provisioning input: ${err.path}: ${err.message}`);
    output.stderr(usageText());
    return;
  }

  if (err instanceof ProvisionTempleError) {
    if (err.status === 409) {
      output.stderr(`Temple provisioning conflict${err.field ? ` at ${err.field}` : ""}.`);
      return;
    }
    if (err.status === 400) {
      output.stderr("Invalid provisioning input.");
      return;
    }
    output.stderr("Temple provisioning failed.");
    return;
  }

  output.stderr("Temple provisioning failed.");
}

function usageText(): string {
  return [
    "Usage: npm run provision:temple --",
    "  --tenant-name <name> --tenant-slug <slug> --timezone <iana-timezone> --subdomain <slug>",
    "  --first-member-phone <phone> --first-member-name <name>",
    "  --actor-super-admin-id <id> --actor-phone <phone> --actor-name <name>",
    "Optional: --contact-phone <phone> --address <address> --role <code> --roles <codes>",
    "Optional WhatsApp: --whatsapp-phone <phone> --meta-phone-number-id <id> --meta-business-account-id <id>",
    "Env fallbacks: TEMPLE_NAME, TEMPLE_SLUG, TEMPLE_SUBDOMAIN, TEMPLE_TIMEZONE, FIRST_MEMBER_PHONE, FIRST_MEMBER_DISPLAY_NAME, SUPER_ADMIN_ID, SUPER_ADMIN_PHONE_NUMBER, SUPER_ADMIN_DISPLAY_NAME",
  ].join("\n");
}

function isDirectRun(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint) && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isDirectRun()) {
  void runProvisionTempleCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
