# Dead Code Audit

The exhaustive per-file inventory records static dependents and reachability cautions for every source file. Start with the [File Intelligence Index](../02-File-Intelligence/README.md) and the [Engineering Audit](../03-Audits/Engineering-Audit.md).

No file is classified as dead solely because it has no static importer: Next.js routes/pages, scripts, migrations, configuration, tests, and assets are discovered by frameworks or operators. Candidates require runtime and product-owner confirmation before deletion.
