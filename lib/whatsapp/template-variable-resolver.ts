export type TemplateVariableResolution = { ok: true; values: string[] } | { ok: false; missing: string[] };

/**
 * Maps a template's ordered named variable list (e.g. ["templeName","userName"])
 * to Meta's positional {{1}},{{2}}... params, pulling values from context
 * (assembled by the caller from the notification's metadata + recipient/tenant
 * info). Returns which names are missing instead of guessing or silently
 * sending blank params — never manually concatenate strings into a template call.
 */
export function resolveTemplateVariables(
  variableNames: string[],
  context: Record<string, string | undefined>,
): TemplateVariableResolution {
  const missing: string[] = [];
  const values: string[] = [];
  for (const name of variableNames) {
    const value = context[name];
    if (value === undefined || value === "") {
      missing.push(name);
    } else {
      values.push(value);
    }
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, values };
}
