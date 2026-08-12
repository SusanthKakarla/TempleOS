import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";
import { WEBSITE_DOMAIN } from "@/lib/site/website-host";

function request(url: string, host?: string) {
  return new NextRequest(new URL(url), { headers: host ? { host } : undefined });
}

/** Next signals a rewrite with this header; absence means the request passed through. */
function rewriteTarget(response: Response): string | null {
  const destination = response.headers.get("x-middleware-rewrite");
  return destination ? new URL(destination).pathname : null;
}

describe("public website hostname routing", () => {
  it.each([
    ["/", "/site"],
    ["/about", "/site/about"],
    ["/events/abc-123", "/site/events/abc-123"],
  ])("rewrites %s on a temple hostname to %s", (pathname, expected) => {
    const response = middleware(request(`https://sivatemple.${WEBSITE_DOMAIN}${pathname}`, `sivatemple.${WEBSITE_DOMAIN}`));
    expect(rewriteTarget(response)).toBe(expected);
  });

  it("leaves the admin/product hostname completely untouched — the Tenant Admin Portal's routing is unchanged", () => {
    for (const pathname of ["/", "/login", "/dashboard", "/dashboard/devotees", "/donate/x/y/z"]) {
      const response = middleware(request(`https://sivatemple.trytempleos.com${pathname}`, "sivatemple.trytempleos.com"));
      expect(rewriteTarget(response)).toBeNull();
    }
  });

  it("never rewrites API or already-rewritten paths, even on a temple hostname", () => {
    for (const pathname of ["/api/website", "/site/about"]) {
      const response = middleware(request(`https://sivatemple.${WEBSITE_DOMAIN}${pathname}`, `sivatemple.${WEBSITE_DOMAIN}`));
      expect(rewriteTarget(response)).toBeNull();
    }
  });

  it("rewrites a client-side navigation's data request the same way as the page itself", () => {
    // Next resolves /_next/data/<buildId>/about.json to nextUrl.pathname
    // "/about", so this is a page request and must follow the page's rewrite —
    // otherwise a link click would fetch the marketing route's data instead.
    const response = middleware(
      request(`https://sivatemple.${WEBSITE_DOMAIN}/_next/data/build123/about.json`, `sivatemple.${WEBSITE_DOMAIN}`),
    );
    expect(rewriteTarget(response)).toContain("/site");
  });

  it("ignores the bare website domain and lookalike hosts, so only real temple subdomains are rewritten", () => {
    expect(rewriteTarget(middleware(request(`https://${WEBSITE_DOMAIN}/about`, WEBSITE_DOMAIN)))).toBeNull();
    expect(
      rewriteTarget(middleware(request(`https://evil-${WEBSITE_DOMAIN}/about`, `evil-${WEBSITE_DOMAIN}`))),
    ).toBeNull();
    expect(
      rewriteTarget(
        middleware(request(`https://sivatemple.${WEBSITE_DOMAIN}.attacker.com/about`, `sivatemple.${WEBSITE_DOMAIN}.attacker.com`)),
      ),
    ).toBeNull();
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

  it("keys the rewrite on the forwarded host, which is what the proxy actually presents", () => {
    const response = middleware(
      new NextRequest(new URL("https://internal.railway.app/about"), {
        headers: { "x-forwarded-host": `ramatemple.${WEBSITE_DOMAIN}`, host: "internal.railway.app" },
      }),
    );
    expect(rewriteTarget(response)).toBe("/site/about");
  });
});
