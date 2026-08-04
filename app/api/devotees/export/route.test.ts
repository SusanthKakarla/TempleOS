import { describe, expect, it } from "vitest";
import { parseDevoteeFilters } from "./route";

describe("parseDevoteeFilters", () => {
  it(
    "reads every filter the Devotees table can apply, not just search — " +
      "regression: 'Export Filtered' previously silently ignored registrationType/isDonor/" +
      "whatsappOptIn/hasPhone/occasion/status, exporting a materially different set of rows " +
      "than what the admin was looking at",
    () => {
      const params = new URLSearchParams({
        registrationType: "family",
        isDonor: "true",
        whatsappOptIn: "false",
        hasPhone: "false",
        occasion: "birthday_week",
        status: "all",
      });

      expect(parseDevoteeFilters(params, "Asia/Kolkata")).toEqual({
        registrationType: "family",
        isDonor: true,
        whatsappOptIn: false,
        hasPhone: false,
        occasion: "birthday_week",
        includeInactive: true,
        timezone: "Asia/Kolkata",
      });
    },
  );

  it("defaults every filter to undefined/false when the URL has none set", () => {
    const params = new URLSearchParams();

    expect(parseDevoteeFilters(params, undefined)).toEqual({
      registrationType: undefined,
      isDonor: undefined,
      whatsappOptIn: undefined,
      hasPhone: undefined,
      occasion: undefined,
      includeInactive: false,
      timezone: undefined,
    });
  });

  it("ignores an unrecognized registrationType/occasion value rather than passing it through raw", () => {
    const params = new URLSearchParams({ registrationType: "bogus", occasion: "bogus" });

    const filters = parseDevoteeFilters(params, undefined);
    expect(filters.registrationType).toBeUndefined();
    expect(filters.occasion).toBeUndefined();
  });
});
