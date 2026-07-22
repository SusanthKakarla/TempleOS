import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDevoteeById } from "@/lib/db/devotees";
import { getPreference } from "@/lib/db/notification-preferences";
import { getTemplate } from "@/lib/db/notification-templates";
import { createNotification } from "@/lib/db/notifications";
import { getTenantById } from "@/lib/db/tenants";
import { getTenantMediaIdForType } from "@/lib/db/tenant-notification-media";
import { enqueueNotification } from "./engine";

vi.mock("@/lib/db/devotees", () => ({ getDevoteeById: vi.fn() }));
vi.mock("@/lib/db/notification-preferences", () => ({ getPreference: vi.fn() }));
vi.mock("@/lib/db/notification-templates", () => ({
  getTemplate: vi.fn(),
  renderTemplate: (body: string, vars: Record<string, string>) =>
    body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m),
}));
vi.mock("@/lib/db/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/db/tenants", () => ({ getTenantById: vi.fn() }));
vi.mock("@/lib/db/tenant-notification-media", () => ({ getTenantMediaIdForType: vi.fn() }));

const inAppTemplate = {
  id: "tpl-in-app",
  notificationType: "user_welcome" as const,
  channel: "in_app" as const,
  language: "en" as const,
  title: "Welcome {{name}}",
  body: "Welcome {{name}}",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
};
// Real WhatsApp templates never carry a title — only in-app ones render one.
const whatsappTemplate = { ...inAppTemplate, id: "tpl-whatsapp", channel: "whatsapp" as const, title: null };

describe("enqueueNotification", () => {
  beforeEach(() => {
    vi.mocked(getDevoteeById).mockReset();
    vi.mocked(getPreference).mockReset();
    vi.mocked(getTemplate).mockReset();
    vi.mocked(createNotification).mockReset();
    vi.mocked(getTenantById).mockReset();
    vi.mocked(getTenantById).mockResolvedValue({ status: "active" } as never);
    vi.mocked(getTenantMediaIdForType).mockReset();
    vi.mocked(getTenantMediaIdForType).mockResolvedValue(null);
    vi.mocked(createNotification).mockImplementation(async (input) => ({
      id: "created",
      tenantId: input.tenantId,
      recipientPersonId: input.recipientPersonId ?? null,
      recipientDevoteeId: input.recipientDevoteeId ?? null,
      notificationType: input.notificationType,
      channel: input.channel,
      category: input.category,
      title: input.title,
      message: input.message,
      language: input.language,
      metadata: input.metadata ?? {},
      mediaId: input.mediaId ?? null,
      deliveryStatus: "pending",
      attemptCount: 0,
      nextAttemptAt: "2026-07-21T00:00:00.000Z",
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failureReason: null,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    }));
  });

  it("only enqueues WhatsApp for an opted-in devotee — devotees have no in-app dashboard", async () => {
    vi.mocked(getDevoteeById).mockResolvedValue({ whatsappOptInStatus: true } as never);
    vi.mocked(getTemplate).mockResolvedValue(whatsappTemplate);

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { devoteeId: "devotee-1" },
      notificationType: "birthday_devotee",
      category: "birthday",
      language: "en",
      templateVars: { name: "Ravi" },
    });

    expect(created).toHaveLength(1);
    expect(created[0].channel).toBe("whatsapp");
    expect(getTemplate).toHaveBeenCalledWith("birthday_devotee", "whatsapp", "en");
    expect(getTemplate).not.toHaveBeenCalledWith("birthday_devotee", "in_app", "en");
  });

  it("enqueues nothing for a devotee who hasn't opted in to WhatsApp", async () => {
    vi.mocked(getDevoteeById).mockResolvedValue({ whatsappOptInStatus: false } as never);

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { devoteeId: "devotee-2" },
      notificationType: "birthday_devotee",
      category: "birthday",
      language: "en",
      templateVars: {},
    });

    expect(created).toHaveLength(0);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("enqueues both channels for a tenant member with no saved preference (opt-out default)", async () => {
    vi.mocked(getPreference).mockResolvedValue(null);
    vi.mocked(getTemplate).mockImplementation(async (_type, channel) =>
      channel === "in_app" ? inAppTemplate : whatsappTemplate,
    );

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { personId: "person-1" },
      notificationType: "user_welcome",
      category: "new_user",
      language: "en",
      templateVars: { name: "Ravi" },
    });

    expect(created.map((n) => n.channel).sort()).toEqual(["in_app", "whatsapp"]);
  });

  it("respects a saved preference that disables WhatsApp for that type", async () => {
    vi.mocked(getPreference).mockResolvedValue({
      id: "pref-1",
      personId: "person-1",
      notificationType: "user_welcome",
      inAppEnabled: true,
      whatsappEnabled: false,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });
    vi.mocked(getTemplate).mockResolvedValue(inAppTemplate);

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { personId: "person-1" },
      notificationType: "user_welcome",
      category: "new_user",
      language: "en",
      templateVars: { name: "Ravi" },
    });

    expect(created).toHaveLength(1);
    expect(created[0].channel).toBe("in_app");
  });

  it("renders {{placeholders}} in the message, and in the title when the template has one", async () => {
    vi.mocked(getPreference).mockResolvedValue(null);
    vi.mocked(getTemplate).mockImplementation(async (_type, channel) =>
      channel === "in_app" ? inAppTemplate : whatsappTemplate,
    );

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { personId: "person-1" },
      notificationType: "user_welcome",
      category: "new_user",
      language: "en",
      templateVars: { name: "Ravi" },
    });

    const inApp = created.find((n) => n.channel === "in_app");
    const whatsapp = created.find((n) => n.channel === "whatsapp");
    expect(inApp?.message).toBe("Welcome Ravi");
    expect(inApp?.title).toBe("Welcome Ravi");
    expect(whatsapp?.message).toBe("Welcome Ravi");
    expect(whatsapp?.title).toBeNull();
  });

  it("attaches the tenant's configured banner to the whatsapp row only, never in_app", async () => {
    vi.mocked(getPreference).mockResolvedValue(null);
    vi.mocked(getTemplate).mockImplementation(async (_type, channel) =>
      channel === "in_app" ? inAppTemplate : whatsappTemplate,
    );
    vi.mocked(getTenantMediaIdForType).mockResolvedValue("media-1");

    const created = await enqueueNotification({
      tenantId: "tenant-1",
      recipient: { personId: "person-1" },
      notificationType: "user_welcome",
      category: "new_user",
      language: "en",
      templateVars: { name: "Ravi" },
    });

    const inApp = created.find((n) => n.channel === "in_app");
    const whatsapp = created.find((n) => n.channel === "whatsapp");
    expect(whatsapp?.mediaId).toBe("media-1");
    expect(inApp?.mediaId).toBeNull();
  });
});
