import { getRequestConfig } from "next-intl/server";
import { getLocaleCookie } from "@/lib/i18n/locale";

/**
 * One locale, one message tree, for both surfaces.
 *
 * The admin dashboard's catalogue and the public temple site's are kept in
 * separate files because they are edited by different people at different
 * times, but they are merged here rather than configured separately so there
 * is only ever one locale resolution and one provider. The site's strings live
 * under the `site` namespace, so `useTranslations("site")` reaches them and
 * neither catalogue can shadow a key in the other.
 */
export default getRequestConfig(async () => {
  const locale = await getLocaleCookie();
  const [dashboard, site] = await Promise.all([
    import(`../locales/${locale}/dashboard.json`),
    import(`../locales/${locale}/site.json`),
  ]);

  return {
    locale,
    messages: { ...dashboard.default, site: site.default },
  };
});
