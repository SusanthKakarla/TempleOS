import "./load-env.mts";
import { backfillTenantWebsites } from "../lib/provisioning/backfill-websites";
import { WEBSITE_DOMAIN } from "../lib/site/website-host";
import { getPool } from "../lib/db/pool";

/**
 * Gives temples created before migration 041 the website row and subdomain
 * that provisioning now creates automatically.
 *
 *   npm run backfill:websites -- --dry-run   # report only, writes nothing
 *   npm run backfill:websites                # apply
 *
 * Safe to run repeatedly: existing website configuration is never edited and
 * admin hostnames are never touched.
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`Website domain: ${WEBSITE_DOMAIN}`);
  console.log(dryRun ? "Mode: DRY RUN (no writes)\n" : "Mode: APPLY\n");

  const result = await backfillTenantWebsites({ dryRun });

  console.log(`Tenants scanned:   ${result.scanned}`);
  console.log(`Websites created:  ${result.websitesCreated}`);
  console.log(`Domains created:   ${result.domainsCreated}`);

  if (result.skipped.length > 0) {
    console.log(`\nSkipped (${result.skipped.length}):`);
    for (const item of result.skipped) console.log(`  - ${item.slug}: ${item.reason}`);
  }

  console.log(
    dryRun
      ? "\nNothing was written. Re-run without --dry-run to apply."
      : "\nDone. New websites are DISABLED until an admin publishes them.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
