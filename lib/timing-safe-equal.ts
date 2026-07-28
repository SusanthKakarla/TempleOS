import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison — for secrets/signatures/tokens where a
 * short-circuiting `===` would leak timing information about how many
 * leading bytes matched. `timingSafeEqual` throws on a length mismatch, so
 * that check must run first regardless (also means a length mismatch itself
 * never takes the constant-time path, but leaking "the lengths differ" is
 * not a useful oracle the way "the first N bytes matched" would be).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
