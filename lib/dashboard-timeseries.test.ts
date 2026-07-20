import { describe, expect, it } from "vitest";
import { zeroFillDays } from "./dashboard-timeseries";

interface Row {
  date: string;
  total: number;
}

describe("zeroFillDays", () => {
  it("returns exactly `days` rows even when input is empty", () => {
    const result = zeroFillDays<Row>([], 5, { total: 0 });
    expect(result).toHaveLength(5);
    expect(result.every((row) => row.total === 0)).toBe(true);
  });

  it("keeps existing rows and fills the rest with the zero value", () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const todayRow = { date: `${todayKey}T00:00:00.000Z`, total: 42 };
    const result = zeroFillDays<Row>([todayRow], 3, { total: 0 });

    expect(result).toHaveLength(3);
    expect(result[result.length - 1]).toEqual(todayRow);
    expect(result[0].total).toBe(0);
  });

  it("orders results oldest to newest, ending on today", () => {
    const result = zeroFillDays<Row>([], 3, { total: 0 });
    const dates = result.map((row) => row.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);

    const today = new Date().toISOString().slice(0, 10);
    expect(dates[dates.length - 1]).toBe(today);
  });
});
