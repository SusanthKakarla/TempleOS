import { Pool, types, type PoolConfig } from "pg";

// DATE columns (OID 1082) default to JS `Date` objects built from local-time
// components; calling `.toISOString()` on those can roll the date to the
// adjacent day depending on server timezone. We only ever want the raw
// "YYYY-MM-DD" string (e.g. devotees.date_of_birth), so keep it as-is.
types.setTypeParser(1082, (value) => value);

declare global {
  var __templeosPgPool: Pool | undefined;
}

// Private/local networks (Railway's internal *.railway.internal host included)
// don't speak TLS; only the public internet-facing hosts need it.
function needsSSL(connectionString: string): boolean {
  return !/localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString);
}

// `rejectUnauthorized: false` (no certificate verification, still encrypted)
// is the safe-by-default fallback since most managed Postgres hosts (Railway
// included) don't present a certificate chaining to a well-known public CA.
// Setting DATABASE_CA_CERT (PEM contents) opts into full certificate
// verification once you have your provider's CA cert to supply — this never
// changes on its own, so it can't break an existing deployment.
export function buildSslConfig(connectionString: string): PoolConfig["ssl"] {
  if (!needsSSL(connectionString)) return false;
  const caCert = process.env.DATABASE_CA_CERT;
  return caCert ? { ca: caCert, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    ssl: buildSslConfig(connectionString),
  });
}

// Lazily created so importing this module (e.g. during Next.js's build-time
// page-data collection) never opens a connection before a query actually runs.
// Reused across hot reloads in dev so we don't leak connections.
export function getPool(): Pool {
  if (!globalThis.__templeosPgPool) {
    globalThis.__templeosPgPool = createPool();
  }
  return globalThis.__templeosPgPool;
}
