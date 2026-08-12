/**
 * Shown when a hostname doesn't resolve to a live temple website — unknown
 * subdomain, inactive tenant, or a website that exists but hasn't been
 * switched on.
 *
 * Says nothing about tenants, ids, database state or internal paths: the two
 * cases the caller distinguishes ("not found" vs "unavailable") are the only
 * information a visitor gets, and neither can be used to probe which temples
 * exist.
 */
export function SiteUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="max-w-md text-center">
        <p className="font-heading text-2xl text-[#2F211B]">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-[#6B5B4F]">{message}</p>
        <p className="mt-8 text-xs text-[#8C7B6D]">Powered by TempleOS</p>
      </div>
    </div>
  );
}
