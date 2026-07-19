import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(__dirname);

function readMigration(fileName: string): string {
  return readFileSync(path.join(migrationsDir, fileName), "utf8");
}

function readAllMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map(readMigration)
    .join("\n");
}

describe("forward identity reset schema", () => {
  const initialSchema = readMigration("001_initial_schema.sql");
  const migrationChain = readAllMigrations();

  it("creates the forward identity tables in the clean baseline", () => {
    for (const table of [
      "super_admins",
      "persons",
      "tenant_domains",
      "role_definitions",
      "tenant_memberships",
      "tenant_membership_roles",
    ]) {
      expect(initialSchema).toMatch(new RegExp(`CREATE TABLE ${table} \\(`));
    }
  });

  it("does not create or reference admin_users in the forward migration chain", () => {
    expect(migrationChain).not.toMatch(/CREATE TABLE admin_users \(/);
    expect(migrationChain).not.toMatch(/REFERENCES admin_users\(id\)/);
    expect(migrationChain).not.toMatch(/ALTER TABLE admin_users/);
  });

  it("does not seed a fake pilot tenant in fresh environments", () => {
    const pilotSeed = readMigration("002_seed_pilot_tenant.sql");
    expect(pilotSeed).not.toMatch(/INSERT INTO tenants/i);
    expect(pilotSeed).not.toMatch(/Pilot Temple/);
    expect(pilotSeed).toMatch(/Retired after the super-admin provisioning cutover/);
  });

  it("enforces unique normalized identity, domain, and membership keys", () => {
    expect(initialSchema.match(/phone_number TEXT NOT NULL UNIQUE CHECK/g)).toHaveLength(2);
    expect(initialSchema).toMatch(/phone_number ~ '\^\\\+\[1-9\]\[0-9\]\{1,14\}\$'/);
    expect(initialSchema).toMatch(
      /CREATE UNIQUE INDEX idx_persons_firebase_uid_unique ON persons\(firebase_uid\) WHERE firebase_uid IS NOT NULL;/,
    );
    expect(initialSchema).toMatch(/hostname TEXT NOT NULL UNIQUE CHECK/);
    expect(initialSchema).toMatch(/length\(hostname\) <= 253/);
    expect(initialSchema).toMatch(/hostname = lower\(hostname\)/);
    expect(initialSchema).toMatch(/hostname ~ '\^\(\[a-z0-9\]/);
    expect(initialSchema).toMatch(/hostname !~ '\^\(\[0-9\]\{1,3\}\\\.\)\{3\}\[0-9\]\{1,3\}\$'/);
    expect(initialSchema).toMatch(/UNIQUE \(id, tenant_id\)/);
    expect(initialSchema).toMatch(/UNIQUE \(tenant_id, person_id\)/);
  });

  it("adds unique tenant slugs for super-admin provisioning", () => {
    expect(migrationChain).toMatch(/slug TEXT/);
    expect(migrationChain).toMatch(/UNIQUE \(slug\)|slug TEXT NOT NULL UNIQUE/);
    expect(migrationChain).toMatch(/substr\([^)]*id::text, 1, 8\)/);
    expect(migrationChain).toMatch(/left\([^)]*base_slug, 54\)/);
  });

  it("deduplicates existing WhatsApp rows before enforcing one account per tenant", () => {
    expect(migrationChain).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY tenant_id/);
    expect(migrationChain).toMatch(/DELETE FROM whatsapp_accounts/);
    expect(migrationChain).toMatch(/whatsapp_accounts_tenant_id_unique UNIQUE \(tenant_id\)/);
  });

  it("creates a durable audit log for privileged writes", () => {
    expect(migrationChain).toMatch(/CREATE TABLE audit_log \(/);
    expect(migrationChain).toMatch(/actor_type TEXT NOT NULL/);
    expect(migrationChain).toMatch(/actor_id UUID NOT NULL/);
    expect(migrationChain).toMatch(/tenant_id UUID REFERENCES tenants\(id\)/);
    expect(migrationChain).toMatch(/action TEXT NOT NULL/);
    expect(migrationChain).toMatch(/target_type TEXT NOT NULL/);
    expect(migrationChain).toMatch(/target_id UUID/);
    expect(migrationChain).toMatch(/metadata JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
  });

  it("binds author references to the same tenant as their rows", () => {
    expect(initialSchema).toMatch(
      /FOREIGN KEY \(created_by, tenant_id\) REFERENCES tenant_memberships\(id, tenant_id\)/,
    );
    expect(migrationChain).toMatch(
      /FOREIGN KEY \(recorded_by, tenant_id\) REFERENCES tenant_memberships\(id, tenant_id\)/,
    );
  });

  it("assigns roles through tenant_membership_roles instead of persons", () => {
    const personsTable = initialSchema.match(/CREATE TABLE persons \(([\s\S]*?)\n\);/)?.[1] ?? "";
    expect(personsTable).not.toMatch(/\brole\b|\broles\b|role_definition/);
    expect(initialSchema).toMatch(/CREATE TABLE tenant_membership_roles \(/);
    expect(initialSchema).toMatch(/PRIMARY KEY \(membership_id, role_definition_id\)/);
  });
});
