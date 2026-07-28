import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapStandardTemplates } from "./template-bootstrap";
import { STANDARD_TEMPLATE_CATALOG, buildSubmissionGuide } from "./standard-template-catalog";
import * as templatesDb from "@/lib/db/whatsapp-message-templates";

// Copied verbatim from types/db.ts's NotificationType union — kept as a
// plain literal list here rather than a new production export, since this
// is purely a test-time typo guard (Finding: template_key must equal the
// exact NotificationType string or the delivery layer never picks it up).
const REAL_NOTIFICATION_TYPES = new Set([
  "birthday_devotee",
  "birthday_priest",
  "user_welcome",
  "devotee_registered",
  "event_reminder",
  "anniversary_devotee",
  "anniversary_priest",
  "family_occasion_reminder",
  "tenant_config_changed",
  "tenant_status_changed",
  "donation_thank_you",
  "donation_recorded",
  "festival_greeting",
  "new_event",
  "event_updated",
  "event_cancelled",
  "event_announcement",
  "campaign_broadcast",
  "donation_campaign_broadcast",
  "donation_receipt",
  "payment_refunded",
]);

describe("STANDARD_TEMPLATE_CATALOG", () => {
  it("has exactly 32 entries: 16 template keys x {en, te}", () => {
    expect(STANDARD_TEMPLATE_CATALOG).toHaveLength(32);
    const keys = new Set(STANDARD_TEMPLATE_CATALOG.map((e) => e.templateKey));
    expect(keys.size).toBe(16);
  });

  it("every templateKey is a real, currently-firing NotificationType — a typo here means the template silently never gets used", () => {
    for (const entry of STANDARD_TEMPLATE_CATALOG) {
      expect(REAL_NOTIFICATION_TYPES.has(entry.templateKey)).toBe(true);
    }
  });

  it("has no duplicate (templateKey, language) pairs", () => {
    const pairs = STANDARD_TEMPLATE_CATALOG.map((e) => `${e.templateKey}:${e.language}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("omits eventLocationLine from the 3 event keys' variables, since an empty variable is a permanent send failure", () => {
    const eventKeys = ["new_event", "event_updated", "event_cancelled"];
    for (const entry of STANDARD_TEMPLATE_CATALOG.filter((e) => eventKeys.includes(e.templateKey))) {
      expect(entry.variables).not.toContain("eventLocationLine");
    }
  });
});

describe("buildSubmissionGuide", () => {
  it("converts named {{var}} placeholders to Meta's positional {{1}},{{2}}... in variable order, with a legend", () => {
    const guide = buildSubmissionGuide("Hello {{name}}, welcome to {{temple}}.", ["name", "temple"]);
    expect(guide).toContain("Hello {{1}}, welcome to {{2}}.");
    expect(guide).toContain("{{1}} = name");
    expect(guide).toContain("{{2}} = temple");
  });

  it("drops a placeholder not present in variables (e.g. eventLocationLine) rather than surfacing it", () => {
    const guide = buildSubmissionGuide("Event: {{eventTitle}}.{{eventLocationLine}}", ["eventTitle"]);
    expect(guide).not.toContain("eventLocationLine");
    expect(guide).not.toContain("{{2}}");
    expect(guide).toContain("Event: {{1}}.");
  });
});

describe("bootstrapStandardTemplates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is idempotent — a second call inserts nothing once every row already exists", async () => {
    const insertSpy = vi.spyOn(templatesDb, "insertTemplateIfMissing");
    insertSpy.mockResolvedValueOnce({ id: "t1" } as never); // first call: one created
    for (let i = 1; i < 32; i++) {
      insertSpy.mockResolvedValueOnce(null as never); // rest already exist
    }

    const first = await bootstrapStandardTemplates("tenant-1");
    expect(first.created).toHaveLength(1);
    expect(first.alreadyExisted).toHaveLength(31);

    insertSpy.mockReset();
    for (let i = 0; i < 32; i++) {
      insertSpy.mockResolvedValueOnce(null as never); // second run: everything already exists
    }
    const second = await bootstrapStandardTemplates("tenant-1");
    expect(second.created).toHaveLength(0);
    expect(second.alreadyExisted).toHaveLength(32);
  });
});
