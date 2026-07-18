import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { bindPersonFirebaseUid, findPersonByPhone, getPersonById } from "./persons";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "person-1",
  phone_number: "+14155552671",
  display_name: "Tenant Member",
  firebase_uid: null,
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("persons repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("finds a person by normalized phone number", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await findPersonByPhone("+1 415 555 2671");

    expect(result?.id).toBe("person-1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE phone_number = $1"), [
      "+14155552671",
    ]);
  });

  it("returns null for invalid phone input without querying", async () => {
    await expect(findPersonByPhone("not a phone")).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("gets a person by id", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getPersonById("person-1");

    expect(result?.phoneNumber).toBe("+14155552671");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1 LIMIT 1"), [
      "person-1",
    ]);
  });

  it("binds Firebase uid only when empty or already matched", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "person-1" }], rowCount: 1 });

    await expect(bindPersonFirebaseUid("person-1", "firebase-1")).resolves.toBe(true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("firebase_uid IS NULL OR firebase_uid = $2"),
      ["person-1", "firebase-1"],
    );
    expect(String(query.mock.calls[0][0])).toContain("NOT EXISTS");
  });

  it("rejects binding when Firebase uid belongs to another person", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(bindPersonFirebaseUid("person-1", "firebase-2")).resolves.toBe(false);
  });

  it("treats concurrent Firebase uid unique violations as a failed bind", async () => {
    query.mockRejectedValueOnce({ code: "23505" });

    await expect(bindPersonFirebaseUid("person-1", "firebase-2")).resolves.toBe(false);
  });
});
