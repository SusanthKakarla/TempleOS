import { NextResponse, type NextRequest } from "next/server";
import { isPublicWebsitePath, isWebsiteHostname, resolveRequestHostname } from "@/lib/site/website-host";

/**
 * Splits a temple's single hostname into its two surfaces.
 *
 * One deployment, one database, one wildcard domain. On
 * `sivatemple.trytempleos.com`:
 *
 *   /            /about  /events/<id>  …  → rewritten to /site*, the public
 *                                          temple website (visitor's URL is
 *                                          untouched)
 *   /login  /dashboard/*  /api/*  …      → passed through to the existing
 *                                          Tenant Admin Portal, unchanged
 *
 * and on the platform's own host, `trytempleos.com`, nothing is rewritten at
 * all, so the TempleOS marketing site stays exactly where it is.
 *
 * Two properties make this safe to put in front of an authenticated app:
 *
 *  1. The rewrite is driven by an ALLOWLIST of public paths. A route that is
 *     not on that list — including every admin route added in the future — is
 *     never rewritten, so this layer cannot intercept authentication, the API
 *     surface, or the dashboard by omission.
 *  2. It does NOT decide which tenant this is. It has no database access, and
 *     putting tenant identity in the edge would make it forgeable. Resolution
 *     happens server-side in the (site) layout, from the same hostname.
 */
export function middleware(request: NextRequest) {
  const hostname = resolveRequestHostname(request.headers) ?? request.nextUrl.hostname;
  if (!isWebsiteHostname(hostname)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isPublicWebsitePath(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/site${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /*
   * Everything except Next internals and files with an extension. Public
   * assets keep resolving normally on a temple's hostname, so a favicon or
   * uploaded image is not rewritten into the page tree — and /sitemap.xml and
   * /robots.txt reach the root metadata routes that resolve the temple from
   * the hostname themselves.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
