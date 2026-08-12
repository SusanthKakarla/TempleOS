import { describe, expect, it } from "vitest";
import {
  buildWebsiteHostname,
  isPublicWebsitePath,
  isWebsiteHostname,
  resolveRequestHostname,
  WEBSITE_DOMAIN,
} from "./website-host";
import { tenantSubdomainFromHostname } from "@/lib/tenant-domains";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe("WEBSITE_DOMAIN", () => {
  it("is the existing product domain — websites and admin portals share it", () => {
    expect(WEBSITE_DOMAIN).toBe("trytempleos.com");
  });
});

describe("buildWebsiteHostname", () => {
  it("builds the tenant's host from its slug", () => {
    expect(buildWebsiteHostname("sivatemple")).toBe("sivatemple.trytempleos.com");
    expect(buildWebsiteHostname("  SivaTemple ")).toBe("sivatemple.trytempleos.com");
  });

  it("returns null for a slug that cannot form a hostname", () => {
    expect(buildWebsiteHostname("")).toBeNull();
    expect(buildWebsiteHostname("not a host")).toBeNull();
  });
});

describe("resolveRequestHostname", () => {
  it("prefers the forwarded host, drops the port, and takes only the first entry", () => {
    expect(
      resolveRequestHostname(headers({ "x-forwarded-host": "sivatemple.trytempleos.com:443", host: "internal" })),
    ).toBe("sivatemple.trytempleos.com");
    expect(resolveRequestHostname(headers({ "x-forwarded-host": "a.trytempleos.com, b.trytempleos.com" }))).toBe(
      "a.trytempleos.com",
    );
  });

  it("falls back to the host header, and to null when neither is present", () => {
    expect(resolveRequestHostname(headers({ host: "sivatemple.trytempleos.com" }))).toBe("sivatemple.trytempleos.com");
    expect(resolveRequestHostname(headers({}))).toBeNull();
  });
});

describe("isWebsiteHostname", () => {
  it("accepts a temple subdomain — the same host its admin portal answers on", () => {
    expect(isWebsiteHostname("sivatemple.trytempleos.com")).toBe(true);
    expect(isWebsiteHostname("sample.trytempleos.com")).toBe(true);
    expect(isWebsiteHostname("lalitha.trytempleos.com")).toBe(true);
  });

  it("rejects the platform's own marketing hosts, so trytempleos.com keeps its landing page", () => {
    expect(isWebsiteHostname("trytempleos.com")).toBe(false);
    expect(isWebsiteHostname("www.trytempleos.com")).toBe(false);
    expect(isWebsiteHostname(null)).toBe(false);
  });

  it("rejects reserved platform subdomains", () => {
    expect(isWebsiteHostname("api.trytempleos.com")).toBe(false);
    expect(isWebsiteHostname("admin.trytempleos.com")).toBe(false);
    expect(isWebsiteHostname("super-admin.trytempleos.com")).toBe(false);
  });

  it("is not fooled by a lookalike domain, which is the whole point of matching the suffix with its dot", () => {
    expect(isWebsiteHostname("evil-trytempleos.com")).toBe(false);
    expect(isWebsiteHostname("sivatemple.trytempleos.com.attacker.com")).toBe(false);
    expect(isWebsiteHostname("trytempleos.com.attacker.com")).toBe(false);
    // Two labels deep is not a tenant either.
    expect(isWebsiteHostname("a.sivatemple.trytempleos.com")).toBe(false);
  });
});

describe("tenantSubdomainFromHostname", () => {
  it("returns the slug carried by the hostname, and nothing for a non-tenant host", () => {
    expect(tenantSubdomainFromHostname("sivatemple.trytempleos.com")).toBe("sivatemple");
    expect(tenantSubdomainFromHostname("SivaTemple.TryTempleOS.com")).toBe("sivatemple");
    expect(tenantSubdomainFromHostname("trytempleos.com")).toBeNull();
    expect(tenantSubdomainFromHostname("evil-trytempleos.com")).toBeNull();
  });
});

describe("isPublicWebsitePath", () => {
  it("claims the public temple pages", () => {
    for (const path of ["/", "/about", "/timings", "/sevas", "/events", "/gallery", "/slokas", "/contact"]) {
      expect(isPublicWebsitePath(path)).toBe(true);
    }
    expect(isPublicWebsitePath("/events/abc-123")).toBe(true);
    expect(isPublicWebsitePath("/about/")).toBe(true);
  });

  it("leaves the admin portal alone — every one of these must stay on the existing routes", () => {
    for (const path of [
      "/login",
      "/dashboard",
      "/dashboard/devotees",
      "/dashboard/settings/payments",
      "/api/website",
      "/api/auth/session",
      "/donate/siva/deepam/tok",
      "/super-admin",
      "/super-admin/temples",
      "/access-denied",
      "/whatsapp-onboarding",
    ]) {
      expect(isPublicWebsitePath(path)).toBe(false);
    }
  });

  it("does not claim unknown paths, so a route added later is admin-by-default rather than public", () => {
    expect(isPublicWebsitePath("/reports")).toBe(false);
    expect(isPublicWebsitePath("/dashboard/anything-new")).toBe(false);
  });

  it("does not let a deeper path under a public prefix through", () => {
    expect(isPublicWebsitePath("/events/abc/edit")).toBe(false);
    expect(isPublicWebsitePath("/about/secret")).toBe(false);
  });

  it("is not fooled by a prefix that merely starts with a public path's name", () => {
    expect(isPublicWebsitePath("/eventsomething")).toBe(false);
    expect(isPublicWebsitePath("/contact-admin")).toBe(false);
  });
});
