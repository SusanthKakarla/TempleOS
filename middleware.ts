import { NextResponse, type NextRequest } from "next/server";
import { isWebsiteHostname, resolveRequestHostname } from "@/lib/site/website-host";

/**
 * Hostname-based routing for the public temple websites.
 *
 * One deployment serves every temple. A request to `sivatemple.templos.in/about`
 * is rewritten internally to `/site/about`, where the (site) route group
 * renders it; the visitor's URL is untouched. That is what lets thousands of
 * temples share this application without a project, build or database each.
 *
 * The rewrite is keyed only on the hostname, and only for the public website
 * domain. Requests on the admin/product domain are passed through untouched,
 * so nothing about the Tenant Admin Portal's routing changes — and a temple's
 * admin host can never reach the public site's pages.
 *
 * The middleware deliberately does NOT decide which tenant this is: it has no
 * database access, and trusting it to would put tenant identity in the edge.
 * Resolution happens server-side in the (site) layout, from the same hostname.
 */
export function middleware(request: NextRequest) {
  const hostname = resolveRequestHostname(request.headers) ?? request.nextUrl.hostname;
  if (!isWebsiteHostname(hostname)) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Already rewritten, or an internal path that must not be re-pointed at the
  // site tree (Next internals, the API surface, static files).
  // Exact-segment match, not a prefix, so a future "/sitemapped" page would
  // still be rewritten rather than mistaken for the "/site" tree.
  //
  // /robots.txt and /sitemap.xml never reach here at all — the matcher below
  // skips any path with a file extension — which is why both are served by
  // root-level metadata routes that resolve the temple from the hostname
  // themselves (app/robots.ts, app/sitemap.ts) rather than by a rewrite.
  if (pathname === "/site" || pathname.startsWith("/site/") || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /*
   * Everything except Next internals and files with an extension. Public
   * assets keep resolving normally on a temple's hostname, so a favicon or
   * uploaded image is not rewritten into the page tree.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
