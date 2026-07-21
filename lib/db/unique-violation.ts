/** Postgres unique_violation SQLSTATE — raised by both column-level UNIQUE constraints and unique indexes. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

/** The violated constraint/index name, when available — pg reports unique-index violations under the same `constraint` field as named constraints. */
export function getConstraintName(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("constraint" in err)) return undefined;
  return typeof err.constraint === "string" ? err.constraint : undefined;
}
