import { describe, expect, it } from "vitest";
import { buildWebsiteHostname, isWebsiteHostname, resolveRequestHostname, WEBSITE_DOMAIN } from "./website-host";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe("buildWebsiteHostname", () => {
  it("builds the tenant's website host from its slug", () => {
    expect(buildWebsiteHostname("sivatemple")).toBe(`sivatemple.${WEBSITE_DOMAIN}`);
    expect(buildWebsiteHostname("  SivaTemple ")).toBe(`sivatemple.${WEBSITE_DOMAIN}`);
  });

  it("returns null for a slug that cannot form a hostname", () => {
    expect(buildWebsiteHostname("")).toBeNull();
    expect(buildWebsiteHostname("not a host")).toBeNull();
  });
});

describe("resolveRequestHostname", () => {
  it("prefers the forwarded host, drops the port, and takes only the first entry", () => {
    expect(resolveRequestHostname(headers({ "x-forwarded-host": "sivatemple.templos.in:443", host: "internal" }))).toBe(
      "sivatemple.templos.in",
    );
    expect(resolveRequestHostname(headers({ "x-forwarded-host": "a.templos.in, b.templos.in" }))).toBe("a.templos.in");
  });

  it("falls back to the host header, and to null when neither is present", () => {
    expect(resolveRequestHostname(headers({ host: "sivatemple.templos.in" }))).toBe("sivatemple.templos.in");
    expect(resolveRequestHostname(headers({}))).toBeNull();
  });
});

describe("isWebsiteHostname", () => {
  it("separates public website hosts from the admin product domain", () => {
    expect(isWebsiteHostname(`sivatemple.${WEBSITE_DOMAIN}`)).toBe(true);
    // The admin portal's own domain must never be mistaken for a temple site.
    expect(isWebsiteHostname("sivatemple.trytempleos.com")).toBe(false);
    // The bare website domain is the platform's own, not a temple's.
    expect(isWebsiteHostname(WEBSITE_DOMAIN)).toBe(false);
    expect(isWebsiteHostname(null)).toBe(false);
  });

  it("is not fooled by a lookalike domain suffix", () => {
    expect(isWebsiteHostname(`evil-${WEBSITE_DOMAIN}`)).toBe(false);
    expect(isWebsiteHostname(`sivatemple.${WEBSITE_DOMAIN}.attacker.com`)).toBe(false);
  });
});
