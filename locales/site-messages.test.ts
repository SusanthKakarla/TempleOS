import { describe, expect, it } from "vitest";
import en from "./en/site.json";
import te from "./te/site.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") flat.set(path, value);
    else for (const [nested, text] of flatten(value, path)) flat.set(nested, text);
  }
  return flat;
}

const english = flatten(en as Tree);
const telugu = flatten(te as Tree);

/*
 * A missing key does not fail loudly — next-intl renders the key path, and a
 * key that exists only in Telugu is simply never reached. Either way the
 * visitor gets a page in two languages at once, which is the exact failure
 * this suite exists to prevent.
 */
describe("public site message catalogues", () => {
  it("has a Telugu string for every English one", () => {
    const missing = [...english.keys()].filter((key) => !telugu.has(key));
    expect(missing).toEqual([]);
  });

  it("has no Telugu string that English lacks", () => {
    const extra = [...telugu.keys()].filter((key) => !english.has(key));
    expect(extra).toEqual([]);
  });

  it("leaves no Telugu value empty", () => {
    const blank = [...telugu.entries()].filter(([, value]) => value.trim().length === 0).map(([key]) => key);
    expect(blank).toEqual([]);
  });

  /*
   * An untranslated string is easiest to spot as one identical to the English.
   * A handful legitimately are — "English" as the name of the language, and
   * brand names that stay Latin in Telugu copy — so those are named rather
   * than the rule being dropped.
   */
  it("actually translates everything except the deliberate exceptions", () => {
    const allowed = new Set(["language.en", "language.te"]);
    const untranslated = [...english.entries()]
      .filter(([key, value]) => !allowed.has(key) && telugu.get(key) === value)
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  /*
   * Interpolations are what break silently: a placeholder renamed on one side
   * renders as literal braces in that language only.
   */
  it("uses the same placeholders in both languages", () => {
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    for (const [key, value] of english) {
      expect({ key, vars: placeholders(telugu.get(key) ?? "") }).toEqual({ key, vars: placeholders(value) });
    }
  });
});
