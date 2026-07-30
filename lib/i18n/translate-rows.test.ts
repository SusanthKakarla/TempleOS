import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateMany } from "./translate";
import { translateFields } from "./translate-rows";

vi.mock("./translate", () => ({ translateMany: vi.fn() }));

interface Row {
  id: string;
  displayName: string;
  familyName: string | null;
}

describe("translateFields", () => {
  beforeEach(() => {
    vi.mocked(translateMany).mockReset();
  });

  it("returns the rows completely untouched for locale 'en', never calling translateMany", async () => {
    const rows: Row[] = [{ id: "1", displayName: "Rama Krishna", familyName: null }];

    const result = await translateFields(rows, "en", ["displayName", "familyName"]);

    expect(result).toBe(rows);
    expect(translateMany).not.toHaveBeenCalled();
  });

  it("returns rows untouched for an empty array, without calling translateMany", async () => {
    const result = await translateFields([], "te", ["displayName"]);
    expect(result).toEqual([]);
    expect(translateMany).not.toHaveBeenCalled();
  });

  it("translates only the specified fields, leaving ids and other fields untouched", async () => {
    const rows: Row[] = [{ id: "1", displayName: "Rama Krishna", familyName: "Reddy Family" }];
    vi.mocked(translateMany).mockResolvedValue(["రామ కృష్ణ", "రెడ్డి కుటుంబం"]);

    const result = await translateFields(rows, "te", ["displayName", "familyName"]);

    expect(result).toEqual([{ id: "1", displayName: "రామ కృష్ణ", familyName: "రెడ్డి కుటుంబం" }]);
    expect(translateMany).toHaveBeenCalledWith(["Rama Krishna", "Reddy Family"]);
  });

  it("skips null/empty field values without passing them to translateMany", async () => {
    const rows: Row[] = [{ id: "1", displayName: "Rama Krishna", familyName: null }];
    vi.mocked(translateMany).mockResolvedValue(["రామ కృష్ణ"]);

    const result = await translateFields(rows, "te", ["displayName", "familyName"]);

    expect(result).toEqual([{ id: "1", displayName: "రామ కృష్ణ", familyName: null }]);
    expect(translateMany).toHaveBeenCalledWith(["Rama Krishna"]);
  });

  it("applies the same translation to duplicate values across multiple rows in one call", async () => {
    const rows: Row[] = [
      { id: "1", displayName: "Ramesh Reddy", familyName: null },
      { id: "2", displayName: "Ramesh Reddy", familyName: null },
    ];
    vi.mocked(translateMany).mockResolvedValue(["రమేష్ రెడ్డి", "రమేష్ రెడ్డి"]);

    const result = await translateFields(rows, "te", ["displayName"]);

    expect(result[0].displayName).toBe("రమేష్ రెడ్డి");
    expect(result[1].displayName).toBe("రమేష్ రెడ్డి");
  });

  it("does not mutate the original row objects", async () => {
    const rows: Row[] = [{ id: "1", displayName: "Rama Krishna", familyName: null }];
    vi.mocked(translateMany).mockResolvedValue(["రామ కృష్ణ"]);

    await translateFields(rows, "te", ["displayName"]);

    expect(rows[0].displayName).toBe("Rama Krishna");
  });
});
