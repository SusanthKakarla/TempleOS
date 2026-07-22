import { getPool } from "./pool";
import type { NotificationChannel, NotificationTemplate, NotificationType, SupportedLanguage } from "@/types/db";

interface NotificationTemplateRow {
  id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  language: SupportedLanguage;
  title: string | null;
  body: string;
  created_at: Date;
  updated_at: Date;
}

function mapTemplate(row: NotificationTemplateRow): NotificationTemplate {
  return {
    id: row.id,
    notificationType: row.notification_type,
    channel: row.channel,
    language: row.language,
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Falls back to English when the requested language has no row for this type/channel. */
export async function getTemplate(
  notificationType: NotificationType,
  channel: NotificationChannel,
  language: SupportedLanguage,
): Promise<NotificationTemplate | null> {
  const { rows } = await getPool().query<NotificationTemplateRow>(
    `SELECT * FROM notification_templates
     WHERE notification_type = $1 AND channel = $2 AND language = ANY($3::text[])
     ORDER BY CASE WHEN language = $4 THEN 0 ELSE 1 END
     LIMIT 1`,
    [notificationType, channel, [language, "en"], language],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

/** `{{key}}` substitution — the small, fixed placeholder set here doesn't warrant a templating library. */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

interface TemplateSeed {
  notificationType: NotificationType;
  channel: NotificationChannel;
  language: SupportedLanguage;
  title: string | null;
  body: string;
}

const NOTIFICATION_TEMPLATE_SEEDS: TemplateSeed[] = [
  // Birthday wish — devotee, WhatsApp only (devotees have no in-app dashboard access).
  {
    notificationType: "birthday_devotee",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🎉 Happy Birthday, {{devoteeName}}!\n\n🙏 On behalf of {{templeName}}, we wish you a joyful, healthy, and prosperous year ahead.\n\nMay the divine blessings of the Lord always be with you and your family.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    notificationType: "birthday_devotee",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🎉 జన్మదిన శుభాకాంక్షలు {{devoteeName}}!\n\n🙏 {{templeName}} తరఫున మీకు హృదయపూర్వక జన్మదిన శుభాకాంక్షలు.\n\nదైవానుగ్రహం ఎల్లప్పుడూ మీకు మరియు మీ కుటుంబానికి కలగాలని కోరుకుంటున్నాము.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
  // Birthday pooja reminder — priests.
  {
    notificationType: "birthday_priest",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🔔 Birthday Reminder\n\nToday is the birthday of:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n🎂 Birthday\n\nYou may perform or recommend a special Archana or Birthday Pooja.",
  },
  {
    notificationType: "birthday_priest",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🔔 జన్మదిన రిమైండర్\n\nఈరోజు జన్మదినం:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n🎂 పుట్టినరోజు\n\nమీరు ప్రత్యేక అర్చన లేదా జన్మదిన పూజ నిర్వహించవచ్చు లేదా సూచించవచ్చు.",
  },
  {
    notificationType: "birthday_priest",
    channel: "in_app",
    language: "en",
    title: "Birthday Reminder",
    body: "{{devoteeName}} ({{phoneNumber}}) has a birthday today. Consider a special Archana or Birthday Pooja.",
  },
  {
    notificationType: "birthday_priest",
    channel: "in_app",
    language: "te",
    title: "జన్మదిన రిమైండర్",
    body: "{{devoteeName}} ({{phoneNumber}}) కి ఈరోజు పుట్టినరోజు. ప్రత్యేక అర్చన లేదా జన్మదిన పూజను పరిగణించండి.",
  },
  // Wedding anniversary wish — devotee, WhatsApp only (same reasoning as birthday_devotee).
  {
    notificationType: "anniversary_devotee",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "💍 Happy Wedding Anniversary, {{devoteeName}}!\n\n🙏 On behalf of {{templeName}}, we wish you a lifetime of love, harmony, and divine blessings together.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    notificationType: "anniversary_devotee",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "💍 వివాహ వార్షికోత్సవ శుభాకాంక్షలు {{devoteeName}}!\n\n🙏 {{templeName}} తరఫున మీకు జీవితకాల ప్రేమ, సామరస్యం మరియు దైవానుగ్రహం కలగాలని కోరుకుంటున్నాము.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
  // Anniversary pooja reminder — priests.
  {
    notificationType: "anniversary_priest",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🔔 Anniversary Reminder\n\nToday is the wedding anniversary of:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n💍 Anniversary\n\nYou may perform or recommend a special Anniversary Pooja.",
  },
  {
    notificationType: "anniversary_priest",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🔔 వార్షికోత్సవ రిమైండర్\n\nఈరోజు వివాహ వార్షికోత్సవం:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n💍 వార్షికోత్సవం\n\nమీరు ప్రత్యేక వార్షికోత్సవ పూజ నిర్వహించవచ్చు లేదా సూచించవచ్చు.",
  },
  {
    notificationType: "anniversary_priest",
    channel: "in_app",
    language: "en",
    title: "Anniversary Reminder",
    body: "{{devoteeName}} ({{phoneNumber}}) has a wedding anniversary today. Consider a special Anniversary Pooja.",
  },
  {
    notificationType: "anniversary_priest",
    channel: "in_app",
    language: "te",
    title: "వార్షికోత్సవ రిమైండర్",
    body: "{{devoteeName}} ({{phoneNumber}}) కి ఈరోజు వివాహ వార్షికోత్సవం. ప్రత్యేక వార్షికోత్సవ పూజను పరిగణించండి.",
  },
  // Family reminder — always to the family head, who is a devotee (WhatsApp-only
  // recipient, same as birthday_devotee — devotees have no in-app dashboard access).
  {
    notificationType: "family_occasion_reminder",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "📢 Family Reminder\n\nTomorrow:\n{{occasionList}}\n\nfrom {{templeName}}",
  },
  {
    notificationType: "family_occasion_reminder",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "📢 కుటుంబ రిమైండర్\n\nరేపు:\n{{occasionList}}\n\n{{templeName}} నుండి",
  },
  // Platform config changes — Super Admin edited settings, or changed feature/status — to tenant admins.
  {
    notificationType: "tenant_config_changed",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "⚙️ Temple Settings Updated\n\n{{summary}}\n\nUpdated by the TempleOS platform team.",
  },
  {
    notificationType: "tenant_config_changed",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "⚙️ ఆలయ సెట్టింగ్‌లు నవీకరించబడ్డాయి\n\n{{summary}}\n\nTempleOS ప్లాట్‌ఫారమ్ బృందం ద్వారా నవీకరించబడింది.",
  },
  {
    notificationType: "tenant_config_changed",
    channel: "in_app",
    language: "en",
    title: "Temple Settings Updated",
    body: "{{summary}}",
  },
  {
    notificationType: "tenant_config_changed",
    channel: "in_app",
    language: "te",
    title: "ఆలయ సెట్టింగ్‌లు నవీకరించబడ్డాయి",
    body: "{{summary}}",
  },
  {
    notificationType: "tenant_status_changed",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🔔 Temple Status Changed\n\n{{templeName}} is now {{status}}.\n\nContact the TempleOS platform team with any questions.",
  },
  {
    notificationType: "tenant_status_changed",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🔔 ఆలయ స్థితి మార్చబడింది\n\n{{templeName}} ఇప్పుడు {{status}}.\n\nప్రశ్నల కోసం TempleOS ప్లాట్‌ఫారమ్ బృందాన్ని సంప్రదించండి.",
  },
  {
    notificationType: "tenant_status_changed",
    channel: "in_app",
    language: "en",
    title: "Temple Status Changed",
    body: "{{templeName}} is now {{status}}.",
  },
  {
    notificationType: "tenant_status_changed",
    channel: "in_app",
    language: "te",
    title: "ఆలయ స్థితి మార్చబడింది",
    body: "{{templeName}} ఇప్పుడు {{status}}.",
  },
  // New user welcome — admin/priest/committee_member/volunteer.
  {
    notificationType: "user_welcome",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🙏 Welcome to TempleOS!\n\nYou have been added as:\n{{role}}\n\nfor\n{{templeName}}\n\nYou can now securely log in using your registered mobile number.\n\nIf you experience any issues, please contact your Temple Administrator.\n\nThank you for serving the temple community.",
  },
  {
    notificationType: "user_welcome",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🙏 TempleOSకు స్వాగతం!\n\nమిమ్మల్ని ఈ పాత్రలో చేర్చారు:\n{{role}}\n\n{{templeName}} కోసం\n\nమీరు ఇప్పుడు మీ నమోదిత మొబైల్ నంబర్‌తో సురక్షితంగా లాగిన్ కావచ్చు.\n\nఏదైనా సమస్య ఎదురైతే దయచేసి మీ దేవాలయ నిర్వాహకుడిని సంప్రదించండి.\n\nదేవాలయ సేవకు ధన్యవాదాలు.",
  },
  {
    notificationType: "user_welcome",
    channel: "in_app",
    language: "en",
    title: "Welcome to TempleOS",
    body: "You've been added as {{role}} for {{templeName}}. Log in with your registered mobile number.",
  },
  {
    notificationType: "user_welcome",
    channel: "in_app",
    language: "te",
    title: "TempleOSకు స్వాగతం",
    body: "మిమ్మల్ని {{templeName}} కోసం {{role}}గా చేర్చారు. మీ నమోదిత మొబైల్ నంబర్‌తో లాగిన్ అవ్వండి.",
  },
  // New devotee registered — admins/priests.
  {
    notificationType: "devotee_registered",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "👤 New Devotee Added\n\nName: {{devoteeName}}\nPhone: {{phoneNumber}}\nAdded By: {{addedBy}}\nRegistered: {{registrationTime}}",
  },
  {
    notificationType: "devotee_registered",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "👤 కొత్త భక్తుడు చేర్చబడ్డారు\n\nపేరు: {{devoteeName}}\nఫోన్: {{phoneNumber}}\nచేర్చినవారు: {{addedBy}}\nనమోదు సమయం: {{registrationTime}}",
  },
  {
    notificationType: "devotee_registered",
    channel: "in_app",
    language: "en",
    title: "New Devotee Added",
    body: "{{devoteeName}} ({{phoneNumber}}) was added by {{addedBy}} on {{registrationTime}}.",
  },
  {
    notificationType: "devotee_registered",
    channel: "in_app",
    language: "te",
    title: "కొత్త భక్తుడు చేర్చబడ్డారు",
    body: "{{devoteeName}} ({{phoneNumber}}) ను {{addedBy}} {{registrationTime}}న చేర్చారు.",
  },
  // Event reminder (day-before) — devotees and staff.
  {
    notificationType: "event_reminder",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "📅 Reminder\n\nTomorrow: {{eventTitle}}\n🕒 {{eventTime}}\n📍 {{eventLocation}}\n\nWe look forward to your participation.",
  },
  {
    notificationType: "event_reminder",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "📅 రిమైండర్\n\nరేపు: {{eventTitle}}\n🕒 {{eventTime}}\n📍 {{eventLocation}}\n\nమీ భాగస్వామ్యం కోసం ఎదురుచూస్తున్నాము.",
  },
  {
    notificationType: "event_reminder",
    channel: "in_app",
    language: "en",
    title: "Event Tomorrow",
    body: "{{eventTitle}} is tomorrow at {{eventTime}}, {{eventLocation}}.",
  },
  {
    notificationType: "event_reminder",
    channel: "in_app",
    language: "te",
    title: "రేపు కార్యక్రమం",
    body: "{{eventTitle}} రేపు {{eventTime}} గంటలకు, {{eventLocation}} వద్ద జరుగుతుంది.",
  },
  // Donation thank-you — devotee, WhatsApp only (same reasoning as birthday_devotee).
  {
    notificationType: "donation_thank_you",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🙏 Thank you, {{donorName}}, for your generous donation of {{amount}} towards {{purpose}}.\n\nOn behalf of {{templeName}}, may the deity bless you and your family.",
  },
  {
    notificationType: "donation_thank_you",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🙏 {{purpose}} కొరకు మీ {{amount}} విరాళానికి ధన్యవాదాలు, {{donorName}}.\n\n{{templeName}} తరఫున, దేవుడు మిమ్మల్ని మరియు మీ కుటుంబాన్ని ఆశీర్వదించాలని కోరుకుంటున్నాము.",
  },
  // Festival greeting — one shared template with a {{festivalName}} variable
  // rather than 8 near-duplicate rows (see lib/db/festival-greetings.ts).
  {
    notificationType: "festival_greeting",
    channel: "whatsapp",
    language: "en",
    title: null,
    body: "🎉 {{festivalName}} Greetings!\n\n🙏 {{templeName}} wishes you and your family a joyous {{festivalName}}, filled with divine blessings.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    notificationType: "festival_greeting",
    channel: "whatsapp",
    language: "te",
    title: null,
    body: "🎉 {{festivalName}} శుభాకాంక్షలు!\n\n🙏 {{templeName}} తరఫున మీకు మరియు మీ కుటుంబానికి ఆనందకరమైన {{festivalName}} శుభాకాంక్షలు.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
];

/** Idempotent — safe to run on every deploy, mirrors lib/db/role-definitions.ts's seedV0RoleDefinitions pattern. */
export async function seedNotificationTemplates(): Promise<NotificationTemplate[]> {
  const client = await getPool().connect();
  const templates: NotificationTemplate[] = [];

  try {
    await client.query("BEGIN");
    for (const seed of NOTIFICATION_TEMPLATE_SEEDS) {
      const { rows } = await client.query<NotificationTemplateRow>(
        `INSERT INTO notification_templates (notification_type, channel, language, title, body)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (notification_type, channel, language)
         DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = now()
         RETURNING *`,
        [seed.notificationType, seed.channel, seed.language, seed.title, seed.body],
      );
      templates.push(mapTemplate(rows[0]));
    }
    await client.query("COMMIT");
    return templates;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
