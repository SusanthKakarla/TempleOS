import { getRequestConfig } from "next-intl/server";
import { getLocaleCookie } from "@/lib/i18n/locale";

export default getRequestConfig(async () => {
  const locale = await getLocaleCookie();
  return {
    locale,
    messages: (await import(`../locales/${locale}/dashboard.json`)).default,
  };
});
