import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";

const TENANT_HOST = "sivatemple.trytempleos.com";

function request(url: string, host?: string) {
  return new NextRequest(new URL(url), { headers: host ? { host } : undefined });
}

/** Next signals a rewrite with this header; absence means the request passed through. */
function rewriteTarget(response: Response): string | null {
  const destination = response.headers.get("x-middleware-rewrite");
  return destination ? new URL(destination).pathname : null;
}

describe("tenant hostname routing", () => {
  it.each([
    ["/", "/site"],
    ["/about", "/site/about"],
    ["/timings", "/site/timings"],
    ["/sevas", "/site/sevas"],
    ["/events", "/site/events"],
    ["/events/abc-123", "/site/events/abc-123"],
    ["/gallery", "/site/gallery"],
    ["/slokas", "/site/slokas"],
    ["/contact", "/site/contact"],
  ])("serves the public temple website at %s", (pathname, expected) => {
    expect(rewriteTarget(middleware(request(`https://${TENANT_HOST}${pathname}`, TENANT_HOST)))).toBe(expected);
  });

  /*
   * The single most important guarantee in this file: the Tenant Admin Portal
   * shares this hostname with the public site, and none of its routes may be
   * intercepted or redirected by the website layer.
   */
  it("never touches the admin portal, which lives on the same hostname", () => {
    for (const pathname of [
      "/login",
      "/dashboard",
      "/dashboard/devotees",
      "/dashboard/devotees/family/new",
      "/dashboard/settings",
      "/dashboard/settings/payments",
      "/api/auth/session",
      "/api/website",
      "/api/devotees/import/commit",
      "/donate/sivatemple/deepam/token",
      "/super-admin/temples",
      "/access-denied",
      "/whatsapp-onboarding",
    ]) {
      expect(rewriteTarget(middleware(request(`https://${TENANT_HOST}${pathname}`, TENANT_HOST)))).toBeNull();
    }
  });

  it("leaves the platform's marketing host completely alone, so trytempleos.com keeps its landing page", () => {
    for (const pathname of ["/", "/about", "/login", "/dashboard", "/privacy-policy"]) {
      expect(rewriteTarget(middleware(request(`https://trytempleos.com${pathname}`, "trytempleos.com")))).toBeNull();
      expect(
        rewriteTarget(middleware(request(`https://www.trytempleos.com${pathname}`, "www.trytempleos.com"))),
      ).toBeNull();
    }
  });

  it("leaves sitemap.xml and robots.txt to the root handlers, which resolve the temple themselves", () => {
    for (const pathname of ["/sitemap.xml", "/robots.txt"]) {
      expect(rewriteTarget(middleware(request(`https://${TENANT_HOST}${pathname}`, TENANT_HOST)))).toBeNull();
    }
  });

  it("does not re-rewrite the /site tree it rewrites into", () => {
    expect(rewriteTarget(middleware(request(`https://${TENANT_HOST}/site/about`, TENANT_HOST)))).toBeNull();
  });

  it("ignores lookalike and reserved hosts, so only real temple subdomains are served a website", () => {
    for (const host of [
      "evil-trytempleos.com",
      "sivatemple.trytempleos.com.attacker.com",
      "a.sivatemple.trytempleos.com",
      "api.trytempleos.com",
      "admin.trytempleos.com",
    ]) {
      expect(rewriteTarget(middleware(request(`https://${host}/about`, host)))).toBeNull();
    }
  });

  it("keys the rewrite on the forwarded host, which is what the proxy actually presents", () => {
    const response = middleware(
      new NextRequest(new URL("https://internal.railway.app/about"), {
        headers: { "x-forwarded-host": "ramatemple.trytempleos.com", host: "internal.railway.app" },
      }),
    );
    expect(rewriteTarget(response)).toBe("/site/about");
  });

  /*
   * These assert config.matcher rather than middleware(), because the matcher
   * is what decides whether middleware runs at all. Calling middleware()
   * directly bypasses it, so a test written that way reports a rewrite for
   * /sitemap.xml that never happens in a real deployment — which is exactly
   * how /robots.txt and /sitemap.xml came to 404 on every temple hostname
   * while the suite stayed green.
   */
  describe("matcher", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    it("does not run for robots.txt or sitemap.xml, which root metadata routes serve directly", () => {
      expect(matcher.test("/robots.txt")).toBe(false);
      expect(matcher.test("/sitemap.xml")).toBe(false);
    });

    it("still runs for the pages that need rewriting", () => {
      for (const pathname of ["/", "/about", "/timings", "/events/abc-123"]) {
        expect(matcher.test(pathname)).toBe(true);
      }
    });
  });
});
