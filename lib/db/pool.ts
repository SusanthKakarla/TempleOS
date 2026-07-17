import { Pool } from "pg";

declare global {
  var __templeosPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
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
