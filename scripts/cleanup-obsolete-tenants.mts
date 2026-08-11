/**
 * One-off production cleanup: removes six obsolete demo/test temples.
 *
 * Targets are matched on `tenants.slug` — the column the app itself treats as
 * the tenant's stable identity (lib/db/tenants.ts's getTenantBySlug, and the
 * subdomain each tenant_domains.hostname is built from) — never on name alone.
 * Every resolved id is printed before anything is written, and a slug that
 * matches nothing is reported as NOT FOUND rather than fuzzy-matched onto a
 * similarly named tenant.
 *
 * Deletion is one transaction. Tenant-scoped data is removed by the schema's
 * own ON DELETE CASCADE from tenants(id) (see migrations/001..027); the script
 * counts those rows first so the summary is honest about what the cascade
 * takes. Persons are NOT tenant-scoped: a person is deleted only if, after the
 * cascade, they have no membership in ANY surviving tenant and are not a super
 * admin — a person shared with another temple keeps their account and simply
 * loses this membership.
 *
 *   npm run cleanup:tenants            # dry run: report only, always ROLLBACK
 *   npm run cleanup:tenants -- --commit  # execute and COMMIT
 */
import "./load-env.mts";
import { Pool, type PoolClient } from "pg";

/** Exact tenants.slug values to remove. */
const TARGET_SLUGS = [
  "woop",
  "ddk",
  "siddhu",
  "krishna",
  "metatest",
  "sri-umashankara-vigneswara-swamy",
] as const;

/**
 * `metatest` was provisioned under one of two possible slugs. Both are
 * resolved and reported; the run aborts if they turn out to be two different
 * tenants, so a human decides rather than the script guessing.
 */
const SLUG_ALIASES: Record<string, string[]> = {
  metatest: ["metatest", "meta"],
};

function needsSSL(connectionString: string): boolean {
  return !/localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString);
}

interface TargetTenant {
  requestedSlug: string;
  id: string | null;
  slug: string | null;
  name: string | null;
  hostnames: string[];
}

async function resolveTargets(client: PoolClient): Promise<TargetTenant[]> {
  const targets: TargetTenant[] = [];

  for (const requestedSlug of TARGET_SLUGS) {
    const candidates = SLUG_ALIASES[requestedSlug] ?? [requestedSlug];
    const { rows } = await client.query<{ id: string; slug: string; name: string }>(
      "SELECT id, slug, name FROM tenants WHERE slug = ANY($1::text[])",
      [candidates],
    );

    if (rows.length > 1) {
      throw new Error(
        `Ambiguous target "${requestedSlug}": matched ${rows.length} tenants (${rows
          .map((row) => `${row.slug}=${row.id}`)
          .join(", ")}). Resolve manually before rerunning.`,
      );
    }

    const match = rows[0];
    const hostnames = match
      ? (
          await client.query<{ hostname: string }>(
            "SELECT hostname FROM tenant_domains WHERE tenant_id = $1 ORDER BY hostname",
            [match.id],
          )
        ).rows.map((row) => row.hostname)
      : [];

    targets.push({
      requestedSlug,
      id: match?.id ?? null,
      slug: match?.slug ?? null,
      name: match?.name ?? null,
      hostnames,
    });
  }

  return targets;
}

/** Every table carrying a tenant_id FK to tenants(id), so the report covers the real schema rather than a hardcoded list. */
async function listTenantScopedTables(client: PoolClient): Promise<{ table: string; column: string }[]> {
  const { rows } = await client.query<{ table_name: string; column_name: string; delete_rule: string }>(
    `SELECT tc.table_name, kcu.column_name, rc.delete_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'tenants'
       AND ccu.column_name = 'id'
     ORDER BY tc.table_name`,
  );
  return rows.map((row) => ({ table: row.table_name, column: row.column_name }));
}

async function countRows(
  client: PoolClient,
  table: string,
  column: string,
  tenantIds: string[],
): Promise<number> {
  // Identifiers come from information_schema, never from user input.
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*) AS count FROM "${table}" WHERE "${column}" = ANY($1::uuid[])`,
    [tenantIds],
  );
  return Number(rows[0]?.count ?? 0);
}

/**
 * Persons who belong to a target tenant and to nothing else that survives:
 * no membership outside the targets, and not a platform super admin.
 */
async function findExclusivePersonIds(client: PoolClient, tenantIds: string[]): Promise<string[]> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT DISTINCT p.id
     FROM persons p
     JOIN tenant_memberships tm ON tm.person_id = p.id
     WHERE tm.tenant_id = ANY($1::uuid[])
       AND NOT EXISTS (
         SELECT 1 FROM tenant_memberships other
         WHERE other.person_id = p.id AND other.tenant_id <> ALL($1::uuid[])
       )
       AND NOT EXISTS (
         SELECT 1 FROM super_admins sa WHERE sa.phone_number = p.phone_number
       )
     ORDER BY p.id`,
    [tenantIds],
  );
  return rows.map((row) => row.id);
}

async function main() {
  const commit = process.argv.includes("--commit");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env or .env.local.");
  }

  const pool = new Pool({
    connectionString,
    ssl: needsSSL(connectionString) ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const targets = await resolveTargets(client);
    const tenantIds = targets.flatMap((target) => (target.id ? [target.id] : []));

    console.log(commit ? "MODE: COMMIT (destructive)" : "MODE: DRY RUN (rolls back)");
    console.log("\n=== Target tenants ===");
    for (const target of targets) {
      console.log(
        target.id
          ? `FOUND     ${target.id}  slug=${target.slug}  name=${JSON.stringify(target.name)}  hostnames=[${target.hostnames.join(", ")}]`
          : `NOT FOUND requested slug=${target.requestedSlug} — nothing will be deleted for it`,
      );
    }

    if (tenantIds.length === 0) {
      console.log("\nNo target tenants exist. Nothing to do.");
      await client.query("ROLLBACK");
      return;
    }

    const totalBefore = Number(
      (await client.query<{ count: string }>("SELECT count(*) AS count FROM tenants")).rows[0].count,
    );

    const scopedTables = await listTenantScopedTables(client);
    const counts: Record<string, number> = {};
    for (const { table, column } of scopedTables) {
      const count = await countRows(client, table, column, tenantIds);
      if (count > 0) counts[table] = count;
    }

    const exclusivePersonIds = await findExclusivePersonIds(client, tenantIds);
    const sharedPersonCount = Number(
      (
        await client.query<{ count: string }>(
          `SELECT count(DISTINCT tm.person_id) AS count
           FROM tenant_memberships tm
           WHERE tm.tenant_id = ANY($1::uuid[]) AND tm.person_id <> ALL($2::uuid[])`,
          [tenantIds, exclusivePersonIds],
        )
      ).rows[0].count,
    );

    console.log("\n=== Rows attached to the target tenants ===");
    for (const [table, count] of Object.entries(counts).sort()) {
      console.log(`${table}: ${count}`);
    }
    console.log(`tenants: ${tenantIds.length}`);
    console.log(
      `persons (exclusive to these tenants, will be deleted): ${exclusivePersonIds.length}`,
    );
    console.log(`persons (shared with other tenants or super admins, kept): ${sharedPersonCount}`);

    // Tenant-scoped rows go via ON DELETE CASCADE from tenants(id); persons are
    // removed afterwards, once the cascade has cleared their memberships.
    const deletedTenants = await client.query<{ id: string; slug: string }>(
      "DELETE FROM tenants WHERE id = ANY($1::uuid[]) RETURNING id, slug",
      [tenantIds],
    );

    const deletedPersons = exclusivePersonIds.length
      ? await client.query<{ id: string }>(
          `DELETE FROM persons
           WHERE id = ANY($1::uuid[])
             AND NOT EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = persons.id)
           RETURNING id`,
          [exclusivePersonIds],
        )
      : { rowCount: 0 };

    console.log("\n=== Deleted ===");
    console.log(`tenants: ${deletedTenants.rowCount} (${deletedTenants.rows.map((row) => row.slug).join(", ")})`);
    console.log(`persons: ${deletedPersons.rowCount ?? 0}`);

    // Verification inside the transaction: targets gone, everyone else intact.
    const remainingTargets = await client.query<{ id: string }>(
      "SELECT id FROM tenants WHERE id = ANY($1::uuid[])",
      [tenantIds],
    );
    const totalAfter = Number(
      (await client.query<{ count: string }>("SELECT count(*) AS count FROM tenants")).rows[0].count,
    );
    const orphanRows: string[] = [];
    for (const { table, column } of scopedTables) {
      const count = await countRows(client, table, column, tenantIds);
      if (count > 0) orphanRows.push(`${table}=${count}`);
    }

    console.log("\n=== Verification ===");
    console.log(`target tenants still present: ${remainingTargets.rowCount} (expected 0)`);
    console.log(`tenants before: ${totalBefore} -> after: ${totalAfter} (expected ${totalBefore - tenantIds.length})`);
    console.log(`orphaned tenant-scoped rows: ${orphanRows.length === 0 ? "none" : orphanRows.join(", ")}`);

    const verified =
      remainingTargets.rowCount === 0 &&
      totalAfter === totalBefore - tenantIds.length &&
      orphanRows.length === 0;

    if (!verified) {
      throw new Error("Post-deletion verification failed — rolling back.");
    }

    if (commit) {
      await client.query("COMMIT");
      console.log("\nCOMMIT — cleanup applied.");
    } else {
      await client.query("ROLLBACK");
      console.log("\nROLLBACK — dry run only. Rerun with --commit to apply.");
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\nROLLBACK — cleanup aborted.");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
