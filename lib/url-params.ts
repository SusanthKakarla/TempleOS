/** Returns a new URLSearchParams with `key` set to `value`, or removed when `value` is null/empty. Never mutates the input. */
export function mergeSearchParam(params: URLSearchParams, key: string, value: string | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}
