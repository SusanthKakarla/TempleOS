import { getPool } from "./pool";
import type { Feature, FeatureCategory, FeatureKey } from "@/types/db";

interface FeatureRow {
  id: string;
  key: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  category: FeatureCategory;
  is_core: boolean;
  default_enabled: boolean;
  depends_on: string[];
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function mapFeature(row: FeatureRow): Feature {
  return {
    id: row.id,
    key: row.key as FeatureKey,
    displayName: row.display_name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    isCore: row.is_core,
    defaultEnabled: row.default_enabled,
    dependsOn: row.depends_on as FeatureKey[],
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listFeatures(): Promise<Feature[]> {
  const { rows } = await getPool().query<FeatureRow>(
    "SELECT * FROM features ORDER BY sort_order ASC, key ASC",
  );
  return rows.map(mapFeature);
}

export async function getFeatureByKey(key: FeatureKey): Promise<Feature | null> {
  const { rows } = await getPool().query<FeatureRow>("SELECT * FROM features WHERE key = $1", [key]);
  return rows[0] ? mapFeature(rows[0]) : null;
}

interface FeatureSeed {
  key: FeatureKey;
  displayName: string;
  description: string;
  icon: string;
  category: FeatureCategory;
  isCore?: boolean;
  defaultEnabled?: boolean;
  dependsOn?: FeatureKey[];
  sortOrder: number;
}

/**
 * The brief's example list names ~26 modules; only the "module"-category
 * entries below have a real page/route behind them today. "coming_soon"
 * entries are seeded so the catalog is complete and transparent (per the
 * explicit scope decision for this feature), but default_enabled is always
 * false for them and the provisioning/management UIs never let them be
 * toggled on — there is nothing real to enable yet.
 */
const FEATURE_CATALOG_SEED: FeatureSeed[] = [
  // Core — cannot be disabled.
  { key: "dashboard", displayName: "Dashboard", description: "The tenant's landing page and platform metrics.", icon: "LayoutDashboard", category: "core", isCore: true, defaultEnabled: true, sortOrder: 0 },

  // Real modules.
  { key: "events", displayName: "Events", description: "Create and publish temple events, with announcements and reminders.", icon: "CalendarDays", category: "module", defaultEnabled: true, sortOrder: 10 },
  { key: "devotees", displayName: "Devotees", description: "Devotee records, including individual and family registrations.", icon: "Users", category: "module", defaultEnabled: true, sortOrder: 11 },
  { key: "donations", displayName: "Donations", description: "Manually recorded donations and donor history.", icon: "HandCoins", category: "module", defaultEnabled: true, sortOrder: 12 },
  { key: "conversations", displayName: "Conversations", description: "Inbound/outbound WhatsApp conversation history with devotees.", icon: "MessageCircle", category: "module", defaultEnabled: true, sortOrder: 13 },
  { key: "notifications", displayName: "Notifications", description: "Automated birthday, anniversary, event, and welcome notifications.", icon: "BellRing", category: "module", defaultEnabled: true, sortOrder: 14 },
  { key: "whatsapp_chatbot", displayName: "WhatsApp Chatbot", description: "Temple info, timings, and FAQ content served by the WhatsApp bot.", icon: "Settings2", category: "module", defaultEnabled: true, sortOrder: 15 },
  { key: "user_management", displayName: "User Management", description: "Invite and manage staff who can sign in to this dashboard.", icon: "UserCog", category: "module", defaultEnabled: true, sortOrder: 16 },
  { key: "roles_permissions", displayName: "Roles & Permissions", description: "View the platform's role catalog and assign roles to staff.", icon: "ShieldCheck", category: "module", defaultEnabled: true, dependsOn: ["user_management"], sortOrder: 17 },

  // Real but bundled — not independently routable, so not separately enforced.
  { key: "family_devotees", displayName: "Family Devotees", description: "Family relationship management, part of Devotees.", icon: "UsersRound", category: "module", defaultEnabled: true, dependsOn: ["devotees"], sortOrder: 20 },
  { key: "export", displayName: "Export", description: "Export any list (Events, Devotees, Donations, Users) to Excel/CSV/PDF.", icon: "Download", category: "module", defaultEnabled: true, sortOrder: 21 },
  { key: "import", displayName: "Import", description: "Bulk-import Devotees or Users from a spreadsheet.", icon: "Upload", category: "module", defaultEnabled: true, sortOrder: 22 },

  // Coming soon — seeded for transparency, always disabled, not toggleable.
  { key: "reports", displayName: "Reports", description: "Custom report builder.", icon: "FileBarChart", category: "coming_soon", defaultEnabled: false, sortOrder: 30 },
  { key: "analytics", displayName: "Analytics", description: "Deeper platform analytics beyond the dashboard charts.", icon: "LineChart", category: "coming_soon", defaultEnabled: false, sortOrder: 31 },
  { key: "inventory", displayName: "Inventory", description: "Track temple stock and supplies.", icon: "Package", category: "coming_soon", defaultEnabled: false, sortOrder: 32 },
  { key: "prasadam", displayName: "Prasadam", description: "Prasadam preparation and distribution tracking.", icon: "Soup", category: "coming_soon", defaultEnabled: false, sortOrder: 33 },
  { key: "volunteers", displayName: "Volunteers", description: "Dedicated volunteer roster and scheduling.", icon: "HeartHandshake", category: "coming_soon", defaultEnabled: false, sortOrder: 34 },
  { key: "committee", displayName: "Committee", description: "Committee member roster and meeting records.", icon: "Users2", category: "coming_soon", defaultEnabled: false, sortOrder: 35 },
  { key: "priests", displayName: "Priests", description: "Dedicated priest roster and seva assignments.", icon: "UserRound", category: "coming_soon", defaultEnabled: false, sortOrder: 36 },
  { key: "temple_website", displayName: "Temple Website", description: "A public-facing website for the temple.", icon: "Globe2", category: "coming_soon", defaultEnabled: false, sortOrder: 37 },
  { key: "qr_donations", displayName: "QR Donations", description: "Scan-to-donate QR codes.", icon: "QrCode", category: "coming_soon", defaultEnabled: false, sortOrder: 38 },
  { key: "online_booking", displayName: "Online Booking", description: "Online seva/pooja booking.", icon: "CalendarCheck", category: "coming_soon", defaultEnabled: false, sortOrder: 39 },
  { key: "ai_assistant", displayName: "AI Assistant", description: "An AI assistant for devotee questions.", icon: "Sparkles", category: "coming_soon", defaultEnabled: false, sortOrder: 40 },
  { key: "language_translation", displayName: "Language Translation", description: "Additional languages beyond English and Telugu.", icon: "Languages", category: "coming_soon", defaultEnabled: false, sortOrder: 41 },
  { key: "festival_calendar", displayName: "Festival Calendar", description: "A dedicated festival/panchangam calendar.", icon: "CalendarHeart", category: "coming_soon", defaultEnabled: false, sortOrder: 42 },
  { key: "crm", displayName: "CRM", description: "Devotee relationship pipelines and follow-ups.", icon: "Contact", category: "coming_soon", defaultEnabled: false, sortOrder: 43 },
];

/** Idempotent — safe to run on every deploy, same pattern as seedNotificationTemplates. */
export async function seedFeatureCatalog(): Promise<Feature[]> {
  const client = await getPool().connect();
  const features: Feature[] = [];

  try {
    await client.query("BEGIN");
    for (const seed of FEATURE_CATALOG_SEED) {
      const { rows } = await client.query<FeatureRow>(
        `INSERT INTO features (key, display_name, description, icon, category, is_core, default_enabled, depends_on, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9)
         ON CONFLICT (key) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           category = EXCLUDED.category,
           is_core = EXCLUDED.is_core,
           default_enabled = EXCLUDED.default_enabled,
           depends_on = EXCLUDED.depends_on,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()
         RETURNING *`,
        [
          seed.key,
          seed.displayName,
          seed.description,
          seed.icon,
          seed.category,
          seed.isCore ?? false,
          seed.defaultEnabled ?? true,
          seed.dependsOn ?? [],
          seed.sortOrder,
        ],
      );
      features.push(mapFeature(rows[0]));
    }
    await client.query("COMMIT");
    return features;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
