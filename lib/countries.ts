import { useSyncExternalStore } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

export interface Country {
  iso: CountryCode;
  name: string;
  dialCode: string;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRIES: Country[] = getCountries()
  .map((iso) => ({
    iso,
    name: regionNames.of(iso) ?? iso,
    dialCode: getCountryCallingCode(iso),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_BY_ISO = new Map(COUNTRIES.map((country) => [country.iso, country]));

export function getCountry(iso: CountryCode): Country {
  return COUNTRY_BY_ISO.get(iso) ?? COUNTRY_BY_ISO.get("IN")!;
}

/** Picks a sensible default from the browser's language list; falls back to India. */
function detectDefaultCountry(): CountryCode {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of languages) {
    const region = lang.split("-")[1]?.toUpperCase();
    if (region && COUNTRY_BY_ISO.has(region as CountryCode)) {
      return region as CountryCode;
    }
  }
  return "IN";
}

// The browser's language list never changes during a session, so this never
// needs to notify subscribers — useSyncExternalStore is used purely for its
// getServerSnapshot fallback, matching the pattern in use-resolved-theme.ts,
// to avoid a hydration mismatch between the server (no navigator) and client.
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): CountryCode {
  return "IN";
}

/** SSR-safe: renders "IN" on the server and first paint, then the detected country. */
export function useDefaultCountry(): CountryCode {
  return useSyncExternalStore(subscribe, detectDefaultCountry, getServerSnapshot);
}
