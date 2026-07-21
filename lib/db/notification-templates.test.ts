import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { getTemplate, renderTemplate } from "./notification-templates";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("renderTemplate", () => {
  it("substitutes every {{placeholder}} it finds a value for", () => {
    const result = renderTemplate("Hello {{name}}, welcome to {{temple}}!", {
      name: "Ravi",
      temple: "Sample Temple",
    });
    expect(result).toBe("Hello Ravi, welcome to Sample Temple!");
  });

  it("leaves an unmatched placeholder untouched instead of throwing", () => {
    const result = renderTemplate("Hello {{name}}, code {{missing}}", { name: "Ravi" });
    expect(result).toBe("Hello Ravi, code {{missing}}");
  });
});

describe("getTemplate", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("requests the target language with an English fallback in the same query", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "t-1",
          notification_type: "birthday_devotee",
          channel: "whatsapp",
          language: "te",
          title: null,
          body: "జన్మదిన శుభాకాంక్షలు",
          created_at: new Date("2026-07-21T00:00:00Z"),
          updated_at: new Date("2026-07-21T00:00:00Z"),
        },
      ],
    });

    const result = await getTemplate("birthday_devotee", "whatsapp", "te");

    expect(result?.language).toBe("te");
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "birthday_devotee",
      "whatsapp",
      ["te", "en"],
      "te",
    ]);
  });

  it("returns null when no template exists for this type/channel in either language", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await getTemplate("event_reminder", "in_app", "te");

    expect(result).toBeNull();
  });
});
