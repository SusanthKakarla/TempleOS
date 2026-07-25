import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const docs = path.join(root, "docs");
const now = new Date().toISOString();
const excluded = new Set([".git", ".next", "node_modules", ".agents", ".claude", "_bmad", "_bmad-output", "docs"]);
const sourceExt = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".sql", ".css", ".json", ".yaml", ".yml", ".md", ".svg"]);
const rootFiles = new Set(["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "vitest.config.ts", "eslint.config.mjs", "postcss.config.mjs", "components.json", ".env.example", ".gitignore", "README.md", "MVP_SPEC.md", "PRODUCTION_RESET.md", "ARCHITECTURE_HANDBOOK.md"]);
const slash = (p) => p.replaceAll("\\", "/");
const rel = (p) => slash(path.relative(root, p));
const title = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const ensure = (p) => fs.mkdirSync(p, { recursive: true });
const write = (p, body) => { ensure(path.dirname(p)); fs.writeFileSync(p, `${body.trim()}\n`, "utf8"); outputs.push(rel(p)); };
const encodeLink = (value) => slash(value).replaceAll("%", "%25").replaceAll(" ", "%20").replaceAll("(", "%28").replaceAll(")", "%29").replaceAll("[", "%5B").replaceAll("]", "%5D");
const mdLink = (label, from, to) => `[${label}](${encodeLink(path.relative(path.dirname(from), to))})`;
const outputs = [];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && excluded.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if ((sourceExt.has(path.extname(e.name).toLowerCase()) || rootFiles.has(e.name)) && !e.name.endsWith(".tsbuildinfo")) out.push(full);
  }
  return out;
}

const files = walk(root).sort((a, b) => rel(a).localeCompare(rel(b)));
const byRel = new Map(files.map((f) => [rel(f), f]));
const contents = new Map(files.map((f) => [rel(f), fs.readFileSync(f, "utf8")]));

function importsOf(file, content) {
  if (!/[.](?:[cm]?ts|tsx|js)$/.test(file)) return [];
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = [];
  sf.forEachChild((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
  });
  return [...new Set(imports)];
}

function resolveImport(from, spec) {
  if (!spec.startsWith("@/") && !spec.startsWith(".")) return null;
  const base = spec.startsWith("@/") ? spec.slice(2) : slash(path.join(path.dirname(from), spec));
  const candidates = [base, ...[".ts", ".tsx", ".mts", ".mjs", ".js"].map((x) => base + x), ...["index.ts", "index.tsx", "index.mts"].map((x) => `${base}/${x}`)];
  return candidates.find((x) => byRel.has(slash(x))) ?? null;
}

const importSpecs = new Map();
const resolvedImports = new Map();
const dependents = new Map(files.map((f) => [rel(f), []]));
for (const f of files) {
  const r = rel(f), specs = importsOf(r, contents.get(r));
  importSpecs.set(r, specs);
  const resolved = specs.map((s) => resolveImport(r, s)).filter(Boolean).map(slash);
  resolvedImports.set(r, resolved);
  for (const d of resolved) dependents.get(d)?.push(r);
}

const migrations = files.filter((f) => rel(f).startsWith("migrations/") && f.endsWith(".sql"));
const tables = new Map();
for (const f of migrations) {
  const r = rel(f), c = contents.get(r);
  for (const m of c.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z_][a-z0-9_]*)/gi)) {
    const name = m[1].toLowerCase();
    if (!tables.has(name)) tables.set(name, { created: r, migrations: new Set(), files: new Set(), constraints: [], indexes: [] });
  }
  for (const [name, info] of tables) if (new RegExp(`\\b${name}\\b`, "i").test(c)) info.migrations.add(r);
}
for (const f of files) {
  const r = rel(f), c = contents.get(r);
  for (const [name, info] of tables) if (new RegExp(`\\b${name}\\b`, "i").test(c)) info.files.add(r);
}
for (const f of migrations) {
  const r = rel(f), c = contents.get(r);
  for (const [name, info] of tables) {
    if (!new RegExp(`\\b${name}\\b`, "i").test(c)) continue;
    info.constraints.push(...[...c.matchAll(/(?:CONSTRAINT\s+([a-z0-9_]+)|\b(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b)/gi)].map((m) => m[1] || m[2]).slice(0, 20));
    info.indexes.push(...[...c.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)/gi)].map((m) => m[1]));
  }
}

function classify(r) {
  if (r.includes(".test.")) return ["Test", "Testing"];
  if (r.startsWith("migrations/")) return ["Migration", "Database"];
  if (r.startsWith("app/api/") && r.endsWith("route.ts")) return [r.includes("/cron/") ? "Cron API" : "API Route", r.includes("/super-admin/") ? "Super Admin" : "API"];
  if (/app\/.+\/(?:page|layout|loading|error|template)\.tsx$/.test(r) || /^app\/(?:page|layout)\.tsx$/.test(r)) return [r.includes("layout") ? "Layout" : "Page", "Presentation"];
  if (r.startsWith("features/")) return ["Feature Component", title(r.split("/")[1])];
  if (r.startsWith("components/")) return ["Shared UI Component", "Presentation"];
  if (r.startsWith("hooks/")) return ["Hook", "Shared"];
  if (r.startsWith("lib/db/")) return ["Repository", "Database"];
  if (r.startsWith("lib/auth/")) return ["Authentication/Authorization", "Security"];
  if (r.startsWith("lib/whatsapp/")) return ["WhatsApp Service", "WhatsApp"];
  if (r.startsWith("lib/notifications/")) return ["Notification Service", "Notifications"];
  if (r.startsWith("lib/validation/")) return ["Validation", "Domain"];
  if (r.startsWith("lib/export/")) return ["Export Service", "Export"];
  if (r.startsWith("scripts/")) return ["Script/CLI", "Operations"];
  if (r.startsWith("locales/") || r.startsWith("i18n/")) return ["Localization", "Internationalization"];
  if (/config|package|tsconfig|env|gitignore/.test(r)) return ["Configuration", "Configuration"];
  if (r.endsWith(".md")) return ["Documentation", "Documentation"];
  return [r.startsWith("lib/") ? "Service/Utility" : "Asset", r.split("/")[0] || "Root"];
}

function exported(c) {
  return [...c.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
}
function envs(c) { return [...new Set([...c.matchAll(/process\.env(?:\.([A-Z0-9_]+)|\[\s*["']([A-Z0-9_]+)["']\s*\])/g)].map((m) => m[1] || m[2]))]; }
function methods(c) { return [...new Set([...c.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g)].map((m) => m[1]))]; }
function actions(c) {
  const x = [];
  if (/\bSELECT\b|\.query\(/i.test(c)) x.push("Reads database");
  if (/\bINSERT\b/i.test(c)) x.push("Creates records");
  if (/\bUPDATE\b/i.test(c)) x.push("Updates records");
  if (/\bDELETE\b/i.test(c)) x.push("Deletes records");
  if (/fetch\(|graph\.facebook|firebase/i.test(c)) x.push("Calls an external API");
  if (/cookies\(|SessionToken|setSessionCookie/i.test(c)) x.push("Creates or validates sessions");
  if (/send.*Message|notification/i.test(c)) x.push("Processes notifications/messages");
  if (/upload|ImageKit/i.test(c)) x.push("Uploads/processes media");
  if (/NextResponse|Response\(/.test(c)) x.push("Returns an HTTP response");
  return [...new Set(x)];
}
function risk(r, c, deps) {
  let n = 1;
  if (/auth|session|permission|tenant|super-admin/.test(r)) n += 2;
  if (/migrations|lib\/db|webhook|cron/.test(r)) n += 2;
  if (c.length > 15000 || deps.length > 8) n += 1;
  return n >= 5 ? "Critical" : n >= 4 ? "High" : n >= 3 ? "Medium" : n >= 2 ? "Low" : "Safe";
}
function execution(r, category) {
  if (category.includes("Test")) return "Test runner";
  if (category.includes("Migration")) return "Deployment or explicit migration command";
  if (category.includes("Cron")) return "Authenticated scheduled HTTP request";
  if (category.includes("API")) return "HTTP request";
  if (category === "Page" || category === "Layout") return "Server rendering and page navigation";
  if (category.includes("Component") || category === "Hook") return "React rendering or client interaction";
  if (category.includes("Script")) return "Explicit CLI command";
  return "Imported on demand by its dependents";
}

const fileDocs = new Map();
for (const f of files) {
  const r = rel(f), c = contents.get(r), [category, module] = classify(r);
  const specs = importSpecs.get(r), internal = resolvedImports.get(r), parents = dependents.get(r) || [];
  const usedTables = [...tables.keys()].filter((t) => new RegExp(`\\b${t}\\b`, "i").test(c));
  const usedEnvs = envs(c), http = methods(c), acts = actions(c), ex = exported(c);
  const isClient = /^[\s\S]{0,100}["']use client["']/.test(c);
  const status = parents.length || category.match(/Page|Layout|API|Migration|Test|Script|Configuration|Documentation|Asset/) ? "Active/entry-point" : "No internal dependents detected; review before calling dead code";
  const changeRisk = risk(r, c, internal);
  const score = Math.max(4, 10 - (c.length > 20000 ? 2 : 0) - (internal.length > 12 ? 1 : 0) - (changeRisk === "Critical" ? 1 : 0));
  const out = path.join(docs, "02-File-Intelligence", "files", `${r}.md`);
  fileDocs.set(r, out);
  write(out, `# ${path.basename(r)}

## Basic Information

| Field | Value |
|---|---|
| Full path | \`${r}\` |
| Layer | ${module} |
| Category | ${category} |
| Runtime | ${isClient ? "Client" : category.match(/Component|Hook/) ? "React (server/client determined by parent)" : "Server/build/tooling"} |
| Status | ${status} |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **${changeRisk}** |

## Purpose and Responsibilities

${category} in the **${module}** area. It ${acts.length ? acts.map((x) => x.toLowerCase()).join(", ") : "defines project behavior, structure, data, or configuration consumed by its dependents"}.

${ex.length ? `Public symbols: ${ex.map((x) => `\`${x}\``).join(", ")}.` : "No statically detected named exports."}

## Actions Performed

${acts.length ? acts.map((x) => `- ${x}`).join("\n") : "- No database, session, external API, or HTTP side effect was detected statically."}

## Execution

- Trigger: ${execution(r, category)}
- HTTP methods: ${http.length ? http.join(", ") : "None"}

## Inputs and Outputs

- Inputs: ${specs.length ? `imports from ${specs.map((x) => `\`${x}\``).join(", ")}` : "file-local constants or runtime/framework inputs"}${usedEnvs.length ? `; environment: ${usedEnvs.map((x) => `\`${x}\``).join(", ")}` : ""}.
- Outputs: ${ex.length ? `exports ${ex.map((x) => `\`${x}\``).join(", ")}` : category.includes("API") ? "HTTP response" : category === "Page" ? "Rendered UI" : "side effects or static artifact"}.

## Dependencies

- Internal imports: ${internal.length ? internal.map((x) => `\`${x}\``).join(", ") : "None detected"}
- External imports: ${specs.filter((x) => !x.startsWith("@/") && !x.startsWith(".")).length ? specs.filter((x) => !x.startsWith("@/") && !x.startsWith(".")).map((x) => `\`${x}\``).join(", ") : "None detected"}

## Database Usage

- Tables referenced: ${usedTables.length ? usedTables.map((x) => `\`${x}\``).join(", ") : "None detected"}
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: ${http.length ? http.join(", ") : "Not an API route"}
- External integration indicators: ${/firebase/i.test(c) ? "Firebase " : ""}${/whatsapp|graph\.facebook/i.test(c) ? "Meta/WhatsApp " : ""}${/imagekit/i.test(c) ? "ImageKit" : ""}${!/firebase|whatsapp|graph\.facebook|imagekit/i.test(c) ? "None detected" : ""}

## Security

- Authentication/authorization indicators: ${/getSessionAdmin|requireSuperAdmin|isAuthorizedCronRequest|verifyIdToken|session/i.test(c) ? "Present; verify enforcement paths when modifying" : "None detected in this file"}
- Tenant isolation indicators: ${/tenantId|tenant_id/i.test(c) ? "Tenant identifier is referenced" : "No tenant identifier detected"}
- Validation indicators: ${/safeParse|parse\(|zod|schema/i.test(c) ? "Runtime/schema validation detected" : "No validation marker detected"}
- Secrets: ${usedEnvs.length ? `environment variables only (${usedEnvs.join(", ")})` : "none detected"}
- Rate limiting: ${/rate.?limit/i.test(c) ? "Detected" : "Not implemented locally"}

## Performance

- File size: ${c.split(/\r?\n/).length} lines; ${internal.length} internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: ${parents.length ? parents.map((x) => `\`${x}\``).join(", ") : "No internal dependent detected"}
- Imports: ${internal.length ? internal.map((x) => `\`${x}\``).join(", ") : "No internal modules"}

## Used or Dead

**${status}.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

${c.split(/\r?\n/).length > 400 ? "- Consider splitting this file by responsibility; it exceeds 400 lines.\n" : ""}- Add or update focused tests when behavior changes.
- Require review proportional to the **${changeRisk}** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ${score} | ${Math.max(4, score - (c.length > 15000 ? 1 : 0))} | ${score} | ${score} | ${changeRisk === "Critical" ? 6 : score} | ${r.includes(".test.") || parents.some((x) => x.includes(".test.")) ? 9 : 7} | 8 | ${parents.length > 1 ? 9 : 7} | ${score} |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

\`Runtime/framework → ${r} → ${internal.slice(0, 4).join(" / ") || "output or side effect"}\`

## Cross References

- ${mdLink("File Intelligence Index", out, path.join(docs, "02-File-Intelligence", "README.md"))}
- ${mdLink("API Catalog", out, path.join(docs, "06-Reference", "API-Catalog.md"))}
- ${mdLink("Database Catalog", out, path.join(docs, "06-Reference", "Database-Catalog.md"))}
`);
}

const folders = [...new Set(files.map((f) => path.dirname(rel(f))).filter((x) => x !== "."))].sort();
for (const folder of folders) {
  const direct = files.map(rel).filter((r) => path.dirname(r) === folder);
  const children = folders.filter((x) => path.dirname(x) === folder);
  const layer = classify(`${folder}/index.ts`, "")[1];
  const out = path.join(docs, "02-File-Intelligence", "folders", `${folder}.md`);
  write(out, `# Folder: ${folder}

## Purpose

The \`${folder}/\` folder belongs primarily to the **${layer}** area and groups ${direct.length} direct documented files.

## Responsibilities and Business Module

- Encapsulate ${title(path.basename(folder))} behavior or assets.
- Keep dependencies directed toward shared \`lib/\`, \`components/\`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

${direct.length ? direct.map((r) => `- ${mdLink(`\`${path.basename(r)}\``, out, fileDocs.get(r))}`).join("\n") : "- No direct source files; see child folders."}

## Child Folders

${children.length ? children.map((x) => `- \`${x}/\``).join("\n") : "- None"}

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
`);
}

const routes = files.map(rel).filter((r) => r.startsWith("app/api/") && r.endsWith("/route.ts"));
const routeRows = routes.map((r) => {
  const c = contents.get(r), ms = methods(c), route = "/" + r.replace(/^app\//, "").replace(/\/route\.ts$/, "");
  const auth = /requireSuperAdmin/.test(c) ? "Super admin" : /getSessionAdmin|requireDashboardAdmin/.test(c) ? "Tenant session" : /isAuthorizedCronRequest/.test(c) ? "Cron bearer secret" : r.includes("whatsapp/webhook") ? "Meta webhook verification (GET); POST signature not detected" : r.includes("auth/") ? "Firebase/session boundary" : "Public/retired—inspect route";
  const validation = /safeParse|Schema\.parse|\.parse\(/.test(c) ? "Schema/runtime" : "Manual/framework";
  const used = [...tables.keys()].filter((t) => new RegExp(`\\b${t}\\b`, "i").test(c));
  return `| \`${route}\` | ${ms.join(", ") || "Unknown"} | ${auth} | ${validation} | ${used.join(", ") || "Via imported repositories"} |`;
});
write(path.join(docs, "06-Reference", "API-Catalog.md"), `# API Catalog

Generated from all Next.js route modules. Request/response details live in the linked per-file records under File Intelligence.

| Route | Methods | Authentication | Validation | Direct table indicators |
|---|---|---|---|---|
${routeRows.join("\n")}

## API Standards

- Resolve tenant identity server-side and pass \`tenantId\` into every tenant repository operation.
- Validate untrusted bodies before persistence and return stable JSON error shapes.
- Authenticate cron routes with \`isAuthorizedCronRequest\`; authenticate platform operations with \`requireSuperAdmin\`.
- Verify third-party webhook signatures before accepting side effects.
`);

const dbRows = [...tables.entries()].sort().map(([name, x]) => `| \`${name}\` | \`${x.created}\` | ${[...x.migrations].map((m) => `\`${m}\``).join(", ")} | ${[...x.files].filter((f) => f.startsWith("lib/db/")).map((f) => `\`${f}\``).join(", ") || "No dedicated repository detected"} | ${[...new Set(x.indexes)].join(", ") || "Inline/none detected"} |`);
write(path.join(docs, "06-Reference", "Database-Catalog.md"), `# Database Catalog

TempleOS uses PostgreSQL with forward SQL migrations and repository functions in \`lib/db/\`.

| Table | Created by | Migration history | Repository files | Named indexes detected |
|---|---|---|---|---|
${dbRows.join("\n")}

## Relationships and Governance

- \`tenants\` is the root of tenant-scoped data; repositories must include tenant predicates where applicable.
- \`persons\` represents identity; memberships connect people to tenants and roles.
- Notification and WhatsApp delivery tables retain operational/audit history and should not be hard-deleted casually.
- Migration identity is the full filename recorded in \`schema_migrations\`; renaming applied files requires compatibility handling.
`);

const envMap = new Map();
for (const f of files) for (const e of envs(contents.get(rel(f)))) { if (!envMap.has(e)) envMap.set(e, []); envMap.get(e).push(rel(f)); }
for (const line of (contents.get(".env.example") || "").split(/\r?\n/)) if (/^[A-Z][A-Z0-9_]*=/.test(line)) { const e = line.split("=")[0]; if (!envMap.has(e)) envMap.set(e, []); }
write(path.join(docs, "06-Reference", "Environment-Variables.md"), `# Environment Variable Reference

| Variable | Visibility | Used by | Purpose / governance |
|---|---|---|---|
${[...envMap.entries()].sort().map(([e, fsx]) => `| \`${e}\` | ${e.startsWith("NEXT_PUBLIC_") ? "Browser-visible" : "Server secret/config"} | ${fsx.length ? fsx.map((f) => `\`${f}\``).join(", ") : "Declared but no direct use detected"} | ${/SECRET|TOKEN|PRIVATE|PASSWORD/.test(e) ? "Secret: never log or commit" : "Runtime configuration"} |`).join("\n")}

Use \`.env.example\` for names only. Real values belong in the deployment secret store or ignored \`.env.local\`.
`);

const pkg = JSON.parse(contents.get("package.json"));
write(path.join(docs, "06-Reference", "Dependency-Catalog.md"), `# Dependency Catalog

| Package | Version | Role |
|---|---:|---|
${Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).sort().map(([n, v]) => `| \`${n}\` | \`${v}\` | ${n.startsWith("@types/") ? "Type definitions" : n.includes("next") ? "Next.js framework/tooling" : n.includes("firebase") ? "Firebase authentication/admin" : n === "pg" ? "PostgreSQL client" : n.includes("vitest") ? "Testing" : n.includes("eslint") ? "Linting" : "Application or build dependency"} |`).join("\n")}

Lockfile: \`package-lock.json\`. Runtime engine: Node ${pkg.engines?.node || "not declared"}.
`);

const features = ["Authentication", "Temple Management", "Devotee Management", "Family Management", "Events", "Donations", "Campaigns", "Notifications", "WhatsApp", "CSV Import and Export", "Dashboard", "Settings", "Super Admin", "Roles and Permissions", "Media"];
const featureText = features.map((name) => {
  const terms = name.toLowerCase().split(/\s+/).filter((x) => x.length > 3);
  const related = files.map(rel).filter((r) => terms.some((t) => r.toLowerCase().includes(t.replace("management", "")))).slice(0, 30);
  const featureRoutes = routes.filter((r) => terms.some((t) => r.toLowerCase().includes(t.replace("management", ""))));
  const featureTables = [...tables.keys()].filter((t) => terms.some((x) => t.includes(x.replace("management", ""))));
  return `## ${name}\n\n- Purpose: provide ${name.toLowerCase()} capabilities within the multi-tenant platform.\n- Flow: UI/page → API route → validation/domain helper → repository → PostgreSQL or external provider.\n- Key files: ${related.length ? related.map((x) => `\`${x}\``).join(", ") : "cross-cutting; use Search Index"}.\n- APIs: ${featureRoutes.length ? featureRoutes.map((x) => `\`/${x.replace(/^app\//, "").replace(/\/route\.ts$/, "")}\``).join(", ") : "No dedicated route detected"}.\n- Tables: ${featureTables.length ? featureTables.map((x) => `\`${x}\``).join(", ") : "Uses shared/domain repositories"}.`;
}).join("\n\n");
write(path.join(docs, "01-Architecture", "Feature-Intelligence.md"), `# Feature Intelligence

${featureText}
`);

write(path.join(docs, "01-Architecture", "System-Architecture.md"), `# System Architecture

## Executive Summary

TempleOS is a single-deployable Next.js 16 monolith combining React presentation, App Router APIs, domain services, PostgreSQL repositories, Firebase identity, Meta WhatsApp, notifications, exports, and operational scripts. Tenant identity is resolved at the request boundary and carried into tenant-scoped persistence.

## Layer Rules

| Layer | Paths | Responsibilities | Allowed dependencies | Forbidden dependencies |
|---|---|---|---|---|
| Presentation | \`app/**/page.tsx\`, \`features/\`, \`components/\` | Render and collect user intent | API, shared UI, client-safe utilities | Database and server secrets from client components |
| API | \`app/api/\` | Auth, validation, orchestration, response mapping | Domain, repository, integrations | Trusting client tenant/role claims |
| Domain/service | \`lib/notifications\`, \`lib/whatsapp\`, \`lib/export\`, \`lib/provisioning\` | Business workflows | Repositories, validation, providers | Presentation imports |
| Repository | \`lib/db/\` | Parameterized persistence and mapping | PostgreSQL pool/query client | UI/framework components |
| Infrastructure | Firebase, ImageKit, Meta, cron, scripts | External systems and operations | Configuration and domain contracts | Leaking secrets to browser bundles |
| Database | \`migrations/\`, \`types/db.ts\` | Durable schema and shared record shapes | Forward migration history | Destructive history rewrites |

## High-Level Flow

\`Browser/Meta/Cron → Next.js boundary → authentication + validation → domain service → repository/provider → response, audit, notification\`

## Architecture Invariants

1. Tenant-facing operations derive tenant identity from a validated session or provider account, never an arbitrary body field.
2. Super-admin and tenant sessions remain separate cookie and payload domains.
3. SQL values are parameterized; cross-table business changes use explicit transactions.
4. External callbacks are authenticated, idempotent where provider retries are possible, and logged without secrets.
5. Client components cannot import server-only database or credential modules.
`);

write(path.join(docs, "01-Architecture", "Request-Lifecycles.md"), `# Request Lifecycles

## Tenant Login

\`Login form → Firebase phone OTP → ID token → /api/auth/session → tenant host lookup → person + membership validation → signed HTTP-only session cookie → dashboard authorization\`

## Create or Update Domain Record

\`Feature form → client validation → API request → getSessionAdmin → role/feature authorization → Zod validation → tenant-scoped repository → PostgreSQL → JSON response → UI refresh\`

## Birthday Notification

\`Railway cron → CRON_SECRET verification → birthday candidate query → notification engine/template resolution → conversation/delivery strategy → Meta Graph API → delivery record → webhook status update\`

## WhatsApp Inbound Message

\`Meta webhook → phone-number account lookup → tenant derivation → devotee upsert → command router → tenant content query → localized response → Meta send → message/interaction log\`

## Super-admin Temple Provisioning

\`Super-admin session → validated request/form → provisioning transaction → tenant + domain + person + membership + roles/features → audit record → response\`
`);

write(path.join(docs, "01-Architecture", "Dependency-Graphs.md"), `# Dependency Graphs

## Authentication
\`Firebase client/admin → auth API → session-token → membership/tenant repositories → protected pages/routes\`

## WhatsApp
\`Webhook/onboarding/templates → WhatsApp services → account/message/conversation repositories → Meta Graph API\`

## Notifications
\`Cron/domain event → policy + engine → templates/preferences → delivery strategy → WhatsApp client → notification/message repositories\`

## Devotees, Events, Donations
\`Feature UI → API route → validation → domain repository → PostgreSQL → exports/notifications where requested\`

## Dashboard
\`Dashboard server page → session + tenant feature gates → aggregate repositories → chart/metric components\`

Generated file-level parent/child relationships are available under \`02-File-Intelligence/files/\`.
`);

write(path.join(docs, "00-Project", "Project-Overview.md"), `# TempleOS Project Overview

## Vision and Purpose

TempleOS is a multi-tenant temple operations platform for administrators, platform operators, and devotees. It centralizes temple configuration, devotee/family records, events, donations, notifications, WhatsApp self-service, exports, media, and tenant governance.

## Users and Business Domains

- Tenant administrators manage devotees, families, events, donations, users, settings, media, and notifications.
- Platform super administrators provision and govern temples, roles, features, memberships, and status.
- Devotees interact through temple-managed WhatsApp experiences and communications.

## Technology Stack

Next.js ${pkg.dependencies.next}, React ${pkg.dependencies.react}, TypeScript ${pkg.devDependencies.typescript}, PostgreSQL/pg ${pkg.dependencies.pg}, Firebase, Meta WhatsApp Cloud API, ImageKit, next-intl, Tailwind CSS, Vitest, ESLint.

## Repository Classification

Single cohesive full-stack web monolith. ${files.length} documented source/configuration/assets; ${routes.length} API route modules; ${migrations.length} SQL migrations; ${tables.size} created tables detected.

## Development Philosophy

Prefer explicit tenant boundaries, small domain repositories, validated API contracts, forward-only schema evolution, provider isolation, and tests around identity and business invariants.
`);

const topCounts = [...new Set(files.map((f) => rel(f).split("/")[0]))].sort().map((d) => `| \`${d}\` | ${files.filter((f) => rel(f) === d || rel(f).startsWith(`${d}/`)).length} |`).join("\n");
write(path.join(docs, "00-Project", "Project-Statistics.md"), `# Project Statistics

Generated: ${now}

| Metric | Count |
|---|---:|
| Documented files | ${files.length} |
| Documented folders | ${folders.length} |
| TypeScript/TSX/MTS | ${files.filter((f) => /\.(?:ts|tsx|mts)$/.test(f)).length} |
| API route modules | ${routes.length} |
| Test files | ${files.filter((f) => rel(f).includes(".test.")).length} |
| SQL migrations | ${migrations.length} |
| Database tables created | ${tables.size} |
| Environment variables | ${envMap.size} |

## Top-Level Inventory

| Area | Files |
|---|---:|
${topCounts}
`);

write(path.join(docs, "03-Audits", "Engineering-Audit.md"), `# Engineering Audit

## Architecture Audit

The monolith has clear presentation, boundary, domain, repository, and infrastructure groupings. Primary governance need: codify import boundaries in lint rules rather than relying only on convention.

## Security Audit

- P0: WhatsApp webhook POST signature validation was not statically detected; validate \`X-Hub-Signature-256\` using the app secret before side effects.
- P1: external PostgreSQL connections use \`rejectUnauthorized: false\`; configure certificate verification for production.
- P1: add explicit rate limiting to authentication, upload, import, and externally reachable mutation routes.
- Strength: tenant and super-admin sessions are separated and tenant membership is revalidated.

## Performance Audit

- Add query timing/slow-query telemetry and confirm pagination on every list/export boundary.
- Keep cron work bounded and resumable; avoid sequential provider calls at unbounded tenant scale.
- Self-host fonts to remove build-time Google Fonts availability risk.

## Dependency and Configuration Audit

- Lockfile is present and versions are centrally declared.
- No CI workflow was detected; enforce lint, typecheck, tests, build, and migration validation on pull requests.
- Centralize environment validation at startup to fail fast with actionable errors.

## Technical Debt and Dead-Code Audit

- Duplicate migration numeric prefixes reduce historical clarity; do not delete or rename applied migrations without filename compatibility.
- Retired \`/api/admins\` routes intentionally return 410 and should remain until consumers are confirmed migrated.
- Files with no static dependents are flagged in their records; framework entry points and scripts are not dead solely for that reason.

## Database and Repository Audit

- Repository-per-domain organization is strong and SQL is predominantly parameterized.
- Add automated tenant-scope assertions and migration ordering/clean-database tests.

## API Audit

- Route coverage is broad; authentication patterns are generally centralized.
- Standardize error envelopes, request size limits, idempotency expectations, and rate-limit policy.
`);

// Compatibility entry points referenced by the pre-existing Architecture set.
write(path.join(docs, "Architecture", "Audit", "README.md"), `# Architecture Audit Index

The normalized audit source of truth is [Engineering Audit](../../03-Audits/Engineering-Audit.md). Existing Architecture documents link here for backward-compatible navigation.
`);
write(path.join(docs, "Architecture", "Dead-Code-Audit.md"), `# Dead Code Audit

The exhaustive per-file inventory records static dependents and reachability cautions for every source file. Start with the [File Intelligence Index](../02-File-Intelligence/README.md) and the [Engineering Audit](../03-Audits/Engineering-Audit.md).

No file is classified as dead solely because it has no static importer: Next.js routes/pages, scripts, migrations, configuration, tests, and assets are discovered by frameworks or operators. Candidates require runtime and product-owner confirmation before deletion.
`);
write(path.join(docs, "Architecture", "Refactoring-Opportunities.md"), `# Refactoring Opportunities

The maintained, prioritized plan is [Engineering Master Plans](../05-Master-Plans/Engineering-Roadmaps.md). The highest priorities are webhook authenticity, production database certificate verification, CI gates, boundary rate limiting, observability, safe migration normalization, and critical-journey E2E tests.
`);

write(path.join(docs, "04-Developer-Guide", "Developer-Guide.md"), `# Developer Guide

## Setup

1. Install Node ${pkg.engines?.node || "compatible version"} and PostgreSQL 16.
2. Run \`npm install\`.
3. Copy \`.env.example\` to ignored \`.env.local\` and populate secrets.
4. Run \`npm run migrate\`, \`npm run seed\`, and provision a super admin/tenant.
5. Run \`npm run dev\`.

## Quality Commands

- \`npm run typecheck\`
- \`npm run lint\`
- \`npm test\`
- \`npm run build\`

## Common Workflows

- Add APIs under \`app/api/<domain>/route.ts\`; authenticate, authorize, validate, then delegate.
- Add persistence under \`lib/db/<domain>.ts\`; require tenant identifiers for tenant data.
- Add forward SQL migrations; never edit an applied migration without an explicit compatibility plan.
- Add reusable UI to \`components/\` and domain UI to \`features/<domain>/\`.
- Add translations to both supported locale trees when introducing user-facing text.

## Deployment

The repository targets a dynamic Next.js server with PostgreSQL and scheduled HTTP cron calls. Configure all server secrets, apply migrations before serving new code, verify provider webhooks, and run the production build in CI.
`);

write(path.join(docs, "05-Master-Plans", "Engineering-Roadmaps.md"), `# Engineering Master Plans

| Priority | Initiative | Effort | Business impact | Technical benefit | Dependencies |
|---|---|---|---|---|---|
| P0 | Verify WhatsApp webhook signatures | S | Prevent forged devotee activity | Authenticated provider boundary | Raw-body HMAC handling |
| P1 | Production DB certificate verification | S | Protect data in transit | Strong TLS identity | Provider CA configuration |
| P1 | CI quality and migration gates | M | Safer releases | Automated lint/type/test/build/schema checks | CI provider |
| P1 | Rate limits and request-size limits | M | Abuse resilience | Predictable boundary load | Shared limiter/store |
| P2 | Query and provider observability | M | Faster incident response | Latency/error telemetry | Logging/metrics platform |
| P2 | Normalize migration sequencing safely | M | Clearer schema history | Deterministic unique ordinals | Historical filename aliases |
| P2 | Browser E2E critical journeys | L | Release confidence | Covers framework/integration gaps | Test environment |
| P3 | Enforced layer/import rules | M | Maintainable growth | Prevents architectural erosion | ESLint boundaries |
| P3 | Self-host production fonts | S | Reproducible builds | Removes network dependency | Font assets/licenses |

## Domain Roadmaps

- WhatsApp: signature validation, idempotency, retry/dead-letter visibility, provider health dashboards.
- Database: migration CI, query budgets, indexes from production evidence, backup/restore rehearsal.
- Testing: coverage reporting, E2E identity isolation, webhook contract fixtures, migration-from-zero test.
- Developer experience: CI, CODEOWNERS, generated EKB checks, local bootstrap command.
- Scalability: bounded cron batches, queue-backed delivery, connection-pool sizing, tenant-aware observability.
`);

write(path.join(docs, "07-Engineering-Standards", "Engineering-Standards.md"), `# Engineering Standards

## Naming and Folders

- Use kebab-case filenames, PascalCase React components/types, camelCase functions, and explicit domain terminology.
- Pages/routes orchestrate; \`features/\` owns domain UI; \`components/\` owns reusable UI; \`lib/db/\` owns persistence.

## Import and Layer Rules

- Client code must not import database, Firebase Admin, secrets, or Node-only provider modules.
- Repositories must not import presentation code.
- Cross-domain workflows belong in a named service, not a route or component.

## API and Security

- Authenticate and authorize before reading or mutating protected data.
- Derive tenant identity from trusted server context and validate all untrusted input.
- Use stable error codes, bounded payloads, provider signature checks, and rate limits.

## Database

- Parameterize values, scope tenant queries, use transactions for multi-write invariants, and add evidence-based indexes.
- Migrations are forward-only and immutable after deployment; filenames are durable identifiers.

## Testing

- Unit-test domain rules, validation boundaries, tenant isolation, error mapping, and migration helpers.
- Add integration/E2E coverage for critical identity, provisioning, import, notification, and provider flows.

## Git and Review

- Keep commits cohesive; require passing typecheck, lint, tests, and build.
- Pull requests state risk, tenant/security impact, schema changes, verification, rollback, and documentation impact.
- Critical-risk files require security/domain-owner review.
`);

write(path.join(docs, "08-Architecture-Decisions", "ADR-Index.md"), `# Architecture Decision Records

## Accepted Decisions

1. **ADR-001 — Full-stack Next.js monolith:** shared TypeScript contracts and one deployment optimize current team velocity.
2. **ADR-002 — PostgreSQL repositories:** persistence is organized by domain in \`lib/db\` using parameterized SQL.
3. **ADR-003 — Separate tenant and platform sessions:** prevents identity-domain confusion and limits privilege crossover.
4. **ADR-004 — Tenant identity from trusted boundaries:** host/session/provider account determines tenant scope.
5. **ADR-005 — Forward SQL migrations:** schema history is executable, transactional, and tracked by full filename.
6. **ADR-006 — Firebase phone identity with application sessions:** Firebase proves phone ownership; TempleOS controls authorization and session lifetime.

New consequential architecture choices should be added here with context, decision, alternatives, consequences, and status.
`);

write(path.join(docs, "09-Changelog", "Documentation-Changelog.md"), `# Engineering Knowledge Base Changelog

## ${now.slice(0, 10)}

- Created normalized EKB structure.
- Preserved the official Refactoring Readiness Assessment and Execution Strategy; no application refactoring was performed.
- Indexed every detected source/configuration/asset file and folder.
- Generated API, database, environment, dependency, feature, architecture, lifecycle, audit, standards, roadmap, and search references.
- Preserved and cross-referenced existing \`docs/Architecture\` material and the tracked architecture handbook.
`);

const search = [
  ["Authentication", "lib/auth/, app/api/auth/, features/auth/"], ["Repositories", "lib/db/"], ["Migrations", "migrations/, scripts/migrate.mts"], ["Cron jobs", "app/api/cron/, lib/cron/"], ["WhatsApp", "lib/whatsapp/, app/api/whatsapp/"], ["Notification engine", "lib/notifications/engine.ts, lib/db/notifications.ts"], ["Event creation", "features/events/, app/api/events/, lib/db/events.ts"], ["CSV import", "features/devotees/*import*, features/users/*import*, app/api/*/import/"], ["Image upload", "features/media/, app/api/media/upload/, lib/media/imagekit.ts"], ["Session management", "lib/auth/session.ts, lib/auth/super-admin-session.ts, lib/auth/session-token.ts"], ["Environment variables", "06-Reference/Environment-Variables.md"], ["Tenant isolation", "lib/auth/session.ts and tenant-scoped lib/db repositories"]
];
write(path.join(docs, "06-Reference", "Search-Index.md"), `# Search Index

| Question / concept | Start here |
|---|---|
${search.map(([q, a]) => `| Where is ${q}? | ${a} |`).join("\n")}

For exact parents, children, tables, environment variables, and risk, search \`02-File-Intelligence/files/\` by source path or symbol.
`);

const fileIndex = files.map(rel).map((r) => `- ${mdLink(`\`${r}\``, path.join(docs, "02-File-Intelligence", "README.md"), fileDocs.get(r))}`).join("\n");
write(path.join(docs, "02-File-Intelligence", "README.md"), `# File Intelligence Index

This index covers ${files.length} source, configuration, migration, test, documentation, localization, and asset files. Records are generated from source and include classification, actions, inputs/outputs, dependencies, database/API/security indicators, dependents, risk, health scores, and cross-references.

${fileIndex}
`);

const master = path.join(docs, "Engineering-Knowledge-Base.md");
const sections = [
  ["Project", "00-Project/Project-Overview.md", "Vision, domains, stack, statistics"],
  ["Architecture", "01-Architecture/System-Architecture.md", "Layers, invariants, features, lifecycles, dependency graphs"],
  ["File Intelligence", "02-File-Intelligence/README.md", "Per-file and per-folder intelligence"],
  ["Audits", "03-Audits/Engineering-Audit.md", "Architecture, security, performance, debt, database, API"],
  ["Developer Guide", "04-Developer-Guide/Developer-Guide.md", "Setup, commands, workflows, deployment"],
  ["Master Plans", "05-Master-Plans/Refactoring-Execution-Strategy.md", "Official refactoring readiness decision, safety gates, and execution roadmap"],
  ["Reference", "06-Reference/Search-Index.md", "API, database, dependencies, environment and search"],
  ["Standards", "07-Engineering-Standards/Engineering-Standards.md", "Folder, import, API, database, test, Git standards"],
  ["Decisions", "08-Architecture-Decisions/ADR-Index.md", "Accepted architecture decisions"],
  ["Changelog", "09-Changelog/Documentation-Changelog.md", "EKB change history"]
];
write(master, `# TempleOS Engineering Knowledge Base

> Permanent engineering navigation and source-derived intelligence for TempleOS. Generated ${now}; update with \`npm run docs:ekb\` after structural changes.

## System Overview

TempleOS is a multi-tenant Next.js/PostgreSQL operations platform integrating Firebase phone identity, platform and tenant authorization, Meta WhatsApp, notifications, imports/exports, media, cron automation, and administrative dashboards.

## Project Statistics

- ${files.length} documented files across ${folders.length} folders
- ${routes.length} API route modules
- ${migrations.length} SQL migrations and ${tables.size} detected created tables
- ${files.filter((f) => rel(f).includes(".test.")).length} test files

## Quick Navigation

| Area | Entry point | Contents |
|---|---|---|
${sections.map(([a, p, d]) => `| ${a} | [${p}](${p.replaceAll(" ", "%20")}) | ${d} |`).join("\n")}

## Business Domains

Authentication, tenant provisioning, super administration, roles/features, devotees/families, events, donations, notifications, WhatsApp, chatbot settings, media, imports/exports, localization, and operational cron.

## Existing Deep Architecture Sources

- [Tracked Architecture Handbook](../ARCHITECTURE_HANDBOOK.md)
- [Existing Architecture Document Set](Architecture/Project-Overview.md)

## Search

Start with [Search Index](06-Reference/Search-Index.md), then use the [File Intelligence Index](02-File-Intelligence/README.md) for exact source paths, dependencies, database usage, risks, and modification guidance.
`);

write(path.join(docs, "README.md"), `# TempleOS Documentation

Start at the [Engineering Knowledge Base](Engineering-Knowledge-Base.md). It is the master homepage for architecture, file intelligence, APIs, database, audits, standards, roadmaps, and developer guidance.

The \`Architecture/\` directory contains the pre-existing deep architecture set and remains cross-referenced rather than duplicated.
`);
write(path.join(docs, "index.md"), `# Project Documentation Index

## Project Overview

- **Type:** Single-part full-stack web monolith
- **Primary Language:** TypeScript
- **Architecture:** Next.js App Router layered monolith with PostgreSQL repositories and external provider adapters

## Quick Reference

- **Master EKB:** [Engineering Knowledge Base](Engineering-Knowledge-Base.md)
- **Tech Stack:** [Project Overview](00-Project/Project-Overview.md)
- **Architecture:** [System Architecture](01-Architecture/System-Architecture.md)
- **Source Tree / Files:** [File Intelligence](02-File-Intelligence/README.md)
- **API Contracts:** [API Catalog](06-Reference/API-Catalog.md)
- **Data Models:** [Database Catalog](06-Reference/Database-Catalog.md)
- **Development:** [Developer Guide](04-Developer-Guide/Developer-Guide.md)
- **Components:** [Feature Intelligence](01-Architecture/Feature-Intelligence.md)

## Existing Documentation

- [Architecture Handbook](../ARCHITECTURE_HANDBOOK.md)
- [Existing Architecture Set](Architecture/Project-Overview.md)

## Getting Started

Read the EKB homepage, follow the Developer Guide, and consult per-file intelligence before changing high- or critical-risk modules.
`);

const completed = [
  ["step_1", "Classified as a single-part full-stack web monolith"], ["step_2", "Inventoried existing README, handbook, and 20 architecture documents"], ["step_3", "Documented Next.js, React, TypeScript, PostgreSQL, Firebase, Meta, ImageKit, i18n, and testing stack"], ["step_4", `Generated API, data, feature, configuration, security, dependency, and per-file intelligence for ${files.length} files`], ["step_5", `Documented ${folders.length} source folders and all source paths`], ["step_6", "Generated development, quality, deployment, environment, and standards guidance"], ["step_8", "Generated system and layer architecture documentation"], ["step_9", "Generated supporting project, audit, reference, roadmap, ADR, and changelog documentation"], ["step_10", "Generated master EKB and workflow index"]
].map(([step, summary]) => ({ step, status: "completed", timestamp: now, summary }));
const state = {
  workflow_version: "1.2.0", timestamps: { started: "2026-07-25T15:36:07.425Z", last_updated: now }, mode: "initial_scan", scan_level: "exhaustive",
  project_root: root, project_knowledge: docs, completed_steps: completed, current_step: "step_11",
  project_types: [{ part_id: "templeos", project_type_id: "web", display_name: "Full-stack Next.js web application" }],
  findings: { project_classification: "Single-part full-stack Next.js web monolith", technology_stack: "Next.js 16, React 19, TypeScript, PostgreSQL, Firebase, Meta WhatsApp", batches_completed: [...new Set(files.map((f) => rel(f).split("/")[0]))].map((p) => ({ path: p, files_scanned: files.filter((f) => rel(f) === p || rel(f).startsWith(`${p}/`)).length, summary: `Generated source-derived intelligence for ${p}` })) },
  outputs_generated: [...new Set(["project-scan-report.json", ...outputs.map((x) => x.replace(/^docs\//, ""))])], resume_instructions: "Resume at step 11 validation and review."
};
fs.writeFileSync(path.join(docs, "project-scan-report.json"), JSON.stringify(state), "utf8");
console.log(JSON.stringify({ filesScanned: files.length, folders: folders.length, routes: routes.length, migrations: migrations.length, tables: tables.size, outputs: outputs.length + 1 }, null, 2));
