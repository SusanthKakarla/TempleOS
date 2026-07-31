import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFamiliesForTenant } from "./devotee-families";
import { getPool } from "./pool";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("listFamiliesForTenant", () => {
  beforeEach(() => {
    vi.mocked(getPool).mockReset();
  });

  it("returns summary fields that disambiguate same-name families", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "family-1",
          tenant_id: "tenant-1",
          family_name: "Reddy Family",
          primary_devotee_id: "devotee-1",
          address: "Ward 3",
          city: "Velpur",
          state: "AP",
          pincode: "522001",
          primary_language: null,
          created_at: new Date("2026-07-31T00:00:00.000Z"),
          updated_at: new Date("2026-07-31T00:00:00.000Z"),
          primary_devotee_name: "Srinivas Reddy",
          primary_devotee_phone: "+919876543210",
          member_count: "5",
          member_names: ["Lakshmi Reddy", "Anil Reddy"],
        },
        {
          id: "family-2",
          tenant_id: "tenant-1",
          family_name: "Reddy Family",
          primary_devotee_id: "devotee-2",
          address: "Main Street",
          city: "Velpur",
          state: "AP",
          pincode: "522001",
          primary_language: null,
          created_at: new Date("2026-07-31T00:00:00.000Z"),
          updated_at: new Date("2026-07-31T00:00:00.000Z"),
          primary_devotee_name: "Narasimha Reddy",
          primary_devotee_phone: "+919876543211",
          member_count: 3,
          member_names: ["Radha Reddy"],
        },
      ],
    });
    vi.mocked(getPool).mockReturnValue({ query } as never);

    const families = await listFamiliesForTenant("tenant-1", { search: "reddy" });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("member_devotee.display_name"), [
      "tenant-1",
      "reddy",
      "%reddy%",
      500,
    ]);
    expect(families).toMatchObject([
      {
        id: "family-1",
        familyName: "Reddy Family",
        primaryDevoteeName: "Srinivas Reddy",
        primaryDevoteePhone: "+919876543210",
        memberCount: 5,
        memberNames: ["Lakshmi Reddy", "Anil Reddy"],
      },
      {
        id: "family-2",
        familyName: "Reddy Family",
        primaryDevoteeName: "Narasimha Reddy",
        memberCount: 3,
      },
    ]);
  });
});
