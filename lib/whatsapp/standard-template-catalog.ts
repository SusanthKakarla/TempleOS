import type { SupportedLanguage } from "@/types/db";
import type { WhatsAppTemplateMetaCategory } from "@/types/db";

export interface StandardTemplateCatalogEntry {
  /** Must be a real, currently-firing NotificationType value — the delivery layer looks up templates by this exact string. */
  templateKey: string;
  language: SupportedLanguage;
  metaTemplateName: string;
  metaCategory: WhatsAppTemplateMetaCategory;
  /** Ordered named variables — mapped to Meta's positional {{1}},{{2}}... in this order. */
  variables: string[];
  description: string;
  /** The existing app-side body (from lib/db/notification-templates.ts's WhatsApp-channel seeds), with {{varName}} placeholders — used to derive the submission guide, never sent to Meta directly. */
  appBody: string;
}

/**
 * Converts this app's own `{{varName}}` body copy into Meta's positional
 * `{{1}}`,`{{2}}`... syntax plus a legend, for the copy-paste-ready
 * submission guide shown to the admin. Any placeholder not present in
 * `variables` (e.g. the risky, sometimes-empty `{{eventLocationLine}}`) is
 * dropped entirely rather than surfaced — Meta templates can't have
 * conditional segments, so the guide simply omits that content.
 */
export function buildSubmissionGuide(appBody: string, variables: string[]): string {
  let metaBody = appBody.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const index = variables.indexOf(name);
    return index === -1 ? "" : `{{${index + 1}}}`;
  });
  // Collapse any blank line left behind by a dropped placeholder (e.g. the
  // trailing eventLocationLine, which was its own "\n📍 ..." segment).
  metaBody = metaBody.replace(/\n{3,}/g, "\n\n").trim();

  const legend = variables.map((name, i) => `{{${i + 1}}} = ${name}`).join("\n");
  return `${metaBody}\n\n---\nVariables:\n${legend}`;
}

const CATALOG_SOURCE: Omit<StandardTemplateCatalogEntry, "description">[] = [
  // Welcome — new staff/admin/priest/committee/volunteer member.
  {
    templateKey: "user_welcome",
    language: "en",
    metaTemplateName: "user_welcome",
    metaCategory: "UTILITY",
    variables: ["role", "templeName"],
    appBody:
      "🙏 Welcome to TempleOS!\n\nYou have been added as:\n{{role}}\n\nfor\n{{templeName}}\n\nYou can now securely log in using your registered mobile number.\n\nIf you experience any issues, please contact your Temple Administrator.\n\nThank you for serving the temple community.",
  },
  {
    templateKey: "user_welcome",
    language: "te",
    metaTemplateName: "user_welcome",
    metaCategory: "UTILITY",
    variables: ["role", "templeName"],
    appBody:
      "🙏 TempleOSకు స్వాగతం!\n\nమిమ్మల్ని ఈ పాత్రలో చేర్చారు:\n{{role}}\n\n{{templeName}} కోసం\n\nమీరు ఇప్పుడు మీ నమోదిత మొబైల్ నంబర్‌తో సురక్షితంగా లాగిన్ కావచ్చు.\n\nఏదైనా సమస్య ఎదురైతే దయచేసి మీ దేవాలయ నిర్వాహకుడిని సంప్రదించండి.\n\nదేవాలయ సేవకు ధన్యవాదాలు.",
  },
  // New devotee registered — admins/priests.
  {
    templateKey: "devotee_registered",
    language: "en",
    metaTemplateName: "devotee_registered",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber", "addedBy", "registrationTime"],
    appBody:
      "👤 New Devotee Added\n\nName: {{devoteeName}}\nPhone: {{phoneNumber}}\nAdded By: {{addedBy}}\nRegistered: {{registrationTime}}",
  },
  {
    templateKey: "devotee_registered",
    language: "te",
    metaTemplateName: "devotee_registered",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber", "addedBy", "registrationTime"],
    appBody:
      "👤 కొత్త భక్తుడు చేర్చబడ్డారు\n\nపేరు: {{devoteeName}}\nఫోన్: {{phoneNumber}}\nచేర్చినవారు: {{addedBy}}\nనమోదు సమయం: {{registrationTime}}",
  },
  // New event announcement — devotees. eventLocationLine intentionally
  // omitted from `variables` (see lib/whatsapp/template-bootstrap.ts risk
  // note): it's built as "" when an event has no location, and an empty
  // Meta template variable is treated as invalid → permanent send failure.
  {
    templateKey: "new_event",
    language: "en",
    metaTemplateName: "new_event",
    metaCategory: "MARKETING",
    variables: ["templeName", "eventTitle", "eventDate", "eventTime"],
    appBody:
      '🙏 Namaste. {{templeName}} has announced a new event: *{{eventTitle}}*, on {{eventDate}} at {{eventTime}}.{{eventLocationLine}}\nReply "events" to view upcoming events.',
  },
  {
    templateKey: "new_event",
    language: "te",
    metaTemplateName: "new_event",
    metaCategory: "MARKETING",
    variables: ["templeName", "eventTitle", "eventDate", "eventTime"],
    appBody:
      '🙏 నమస్తే. {{templeName}}లో కొత్త కార్యక్రమం ప్రకటించారు: *{{eventTitle}}*, {{eventDate}} న {{eventTime}}కి.{{eventLocationLine}}\nరాబోయే కార్యక్రమాలు చూడటానికి "కార్యక్రమాలు" అని టైప్ చేయండి.',
  },
  {
    templateKey: "event_updated",
    language: "en",
    metaTemplateName: "event_updated",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "templeName", "eventDate", "eventTime"],
    appBody:
      '🔔 The event *{{eventTitle}}* at {{templeName}} has been updated. New date/time: {{eventDate}} at {{eventTime}}.{{eventLocationLine}}\nReply "events" to view upcoming events.',
  },
  {
    templateKey: "event_updated",
    language: "te",
    metaTemplateName: "event_updated",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "templeName", "eventDate", "eventTime"],
    appBody:
      '🔔 {{templeName}}లోని *{{eventTitle}}* కార్యక్రమం నవీకరించబడింది. కొత్త తేదీ/సమయం: {{eventDate}} న {{eventTime}}.{{eventLocationLine}}\nరాబోయే కార్యక్రమాలు చూడటానికి "కార్యక్రమాలు" అని టైప్ చేయండి.',
  },
  {
    templateKey: "event_cancelled",
    language: "en",
    metaTemplateName: "event_cancelled",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "templeName"],
    appBody:
      '⚠️ The event *{{eventTitle}}* at {{templeName}} has been cancelled. We apologize for the inconvenience.{{eventLocationLine}}\nReply "events" to view upcoming events.',
  },
  {
    templateKey: "event_cancelled",
    language: "te",
    metaTemplateName: "event_cancelled",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "templeName"],
    appBody:
      '⚠️ {{templeName}}లోని *{{eventTitle}}* కార్యక్రమం రద్దు చేయబడింది. అసౌకర్యానికి క్షమించండి.{{eventLocationLine}}\nరాబోయే కార్యక్రమాలు చూడటానికి "కార్యక్రమాలు" అని టైప్ చేయండి.',
  },
  // Event reminder (day-before) — devotees and staff.
  {
    templateKey: "event_reminder",
    language: "en",
    metaTemplateName: "event_reminder",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "eventTime", "eventLocation"],
    appBody: "📅 Reminder\n\nTomorrow: {{eventTitle}}\n🕒 {{eventTime}}\n📍 {{eventLocation}}\n\nWe look forward to your participation.",
  },
  {
    templateKey: "event_reminder",
    language: "te",
    metaTemplateName: "event_reminder",
    metaCategory: "UTILITY",
    variables: ["eventTitle", "eventTime", "eventLocation"],
    appBody: "📅 రిమైండర్\n\nరేపు: {{eventTitle}}\n🕒 {{eventTime}}\n📍 {{eventLocation}}\n\nమీ భాగస్వామ్యం కోసం ఎదురుచూస్తున్నాము.",
  },
  // Birthday wish — devotee.
  {
    templateKey: "birthday_devotee",
    language: "en",
    metaTemplateName: "birthday_devotee",
    metaCategory: "MARKETING",
    variables: ["devoteeName", "templeName"],
    appBody:
      "🎉 Happy Birthday, {{devoteeName}}!\n\n🙏 On behalf of {{templeName}}, we wish you a joyful, healthy, and prosperous year ahead.\n\nMay the divine blessings of the Lord always be with you and your family.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    templateKey: "birthday_devotee",
    language: "te",
    metaTemplateName: "birthday_devotee",
    metaCategory: "MARKETING",
    variables: ["devoteeName", "templeName"],
    appBody:
      "🎉 జన్మదిన శుభాకాంక్షలు {{devoteeName}}!\n\n🙏 {{templeName}} తరఫున మీకు హృదయపూర్వక జన్మదిన శుభాకాంక్షలు.\n\nదైవానుగ్రహం ఎల్లప్పుడూ మీకు మరియు మీ కుటుంబానికి కలగాలని కోరుకుంటున్నాము.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
  // Birthday pooja reminder — priests.
  {
    templateKey: "birthday_priest",
    language: "en",
    metaTemplateName: "birthday_priest",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber"],
    appBody:
      "🔔 Birthday Reminder\n\nToday is the birthday of:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n🎂 Birthday\n\nYou may perform or recommend a special Archana or Birthday Pooja.",
  },
  {
    templateKey: "birthday_priest",
    language: "te",
    metaTemplateName: "birthday_priest",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber"],
    appBody:
      "🔔 జన్మదిన రిమైండర్\n\nఈరోజు జన్మదినం:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n🎂 పుట్టినరోజు\n\nమీరు ప్రత్యేక అర్చన లేదా జన్మదిన పూజ నిర్వహించవచ్చు లేదా సూచించవచ్చు.",
  },
  // Wedding anniversary wish — devotee.
  {
    templateKey: "anniversary_devotee",
    language: "en",
    metaTemplateName: "anniversary_devotee",
    metaCategory: "MARKETING",
    variables: ["devoteeName", "templeName"],
    appBody:
      "💍 Happy Wedding Anniversary, {{devoteeName}}!\n\n🙏 On behalf of {{templeName}}, we wish you a lifetime of love, harmony, and divine blessings together.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    templateKey: "anniversary_devotee",
    language: "te",
    metaTemplateName: "anniversary_devotee",
    metaCategory: "MARKETING",
    variables: ["devoteeName", "templeName"],
    appBody:
      "💍 వివాహ వార్షికోత్సవ శుభాకాంక్షలు {{devoteeName}}!\n\n🙏 {{templeName}} తరఫున మీకు జీవితకాల ప్రేమ, సామరస్యం మరియు దైవానుగ్రహం కలగాలని కోరుకుంటున్నాము.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
  // Anniversary pooja reminder — priests.
  {
    templateKey: "anniversary_priest",
    language: "en",
    metaTemplateName: "anniversary_priest",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber"],
    appBody:
      "🔔 Anniversary Reminder\n\nToday is the wedding anniversary of:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n💍 Anniversary\n\nYou may perform or recommend a special Anniversary Pooja.",
  },
  {
    templateKey: "anniversary_priest",
    language: "te",
    metaTemplateName: "anniversary_priest",
    metaCategory: "UTILITY",
    variables: ["devoteeName", "phoneNumber"],
    appBody:
      "🔔 వార్షికోత్సవ రిమైండర్\n\nఈరోజు వివాహ వార్షికోత్సవం:\n👤 {{devoteeName}}\n📞 {{phoneNumber}}\n💍 వార్షికోత్సవం\n\nమీరు ప్రత్యేక వార్షికోత్సవ పూజ నిర్వహించవచ్చు లేదా సూచించవచ్చు.",
  },
  // Donation recorded — broadcast, deliberately generic (no donor name/amount).
  {
    templateKey: "donation_recorded",
    language: "en",
    metaTemplateName: "donation_recorded",
    metaCategory: "UTILITY",
    variables: ["templeName"],
    appBody:
      "🙏 Donation Update\n\nA new donation has been recorded for {{templeName}}.\n\nThank you for supporting our temple activities.\n\nMay the Lord bless you and your family.",
  },
  {
    templateKey: "donation_recorded",
    language: "te",
    metaTemplateName: "donation_recorded",
    metaCategory: "UTILITY",
    variables: ["templeName"],
    appBody:
      "🙏 విరాళ నవీకరణ\n\n{{templeName}} కోసం కొత్త విరాళం నమోదు చేయబడింది.\n\nమా దేవాలయ కార్యకలాపాలకు మద్దతు ఇచ్చినందుకు ధన్యవాదాలు.\n\nదేవుడు మిమ్మల్ని మరియు మీ కుటుంబాన్ని ఆశీర్వదించాలని కోరుకుంటున్నాము.",
  },
  // Donation thank-you — devotee.
  {
    templateKey: "donation_thank_you",
    language: "en",
    metaTemplateName: "donation_thank_you",
    metaCategory: "UTILITY",
    variables: ["donorName", "amount", "purpose", "templeName"],
    appBody:
      "🙏 Thank you, {{donorName}}, for your generous donation of {{amount}} towards {{purpose}}.\n\nOn behalf of {{templeName}}, may the deity bless you and your family.",
  },
  {
    templateKey: "donation_thank_you",
    language: "te",
    metaTemplateName: "donation_thank_you",
    metaCategory: "UTILITY",
    variables: ["donorName", "amount", "purpose", "templeName"],
    appBody:
      "🙏 {{purpose}} కొరకు మీ {{amount}} విరాళానికి ధన్యవాదాలు, {{donorName}}.\n\n{{templeName}} తరఫున, దేవుడు మిమ్మల్ని మరియు మీ కుటుంబాన్ని ఆశీర్వదించాలని కోరుకుంటున్నాము.",
  },
  // Festival greeting — one shared template with a {{festivalName}} variable.
  {
    templateKey: "festival_greeting",
    language: "en",
    metaTemplateName: "festival_greeting",
    metaCategory: "MARKETING",
    variables: ["festivalName", "templeName"],
    appBody:
      "🎉 {{festivalName}} Greetings!\n\n🙏 {{templeName}} wishes you and your family a joyous {{festivalName}}, filled with divine blessings.\n\n🌸 Om Namah Shivaya 🌸",
  },
  {
    templateKey: "festival_greeting",
    language: "te",
    metaTemplateName: "festival_greeting",
    metaCategory: "MARKETING",
    variables: ["festivalName", "templeName"],
    appBody:
      "🎉 {{festivalName}} శుభాకాంక్షలు!\n\n🙏 {{templeName}} తరఫున మీకు మరియు మీ కుటుంబానికి ఆనందకరమైన {{festivalName}} శుభాకాంక్షలు.\n\n🌸 ఓం నమః శివాయ 🌸",
  },
  // Donation campaign broadcast — goal/raised/link, used only for
  // campaign_type='donation' campaigns with a goal_amount set (see
  // lib/campaigns/donation-message.ts). Distinct from the generic
  // campaign_broadcast key, which has no goal/raised/link variables.
  {
    templateKey: "donation_campaign_broadcast",
    language: "en",
    metaTemplateName: "donation_campaign_broadcast",
    metaCategory: "UTILITY",
    variables: [
      "templeName",
      "campaignTitle",
      "campaignDescription",
      "goalAmount",
      "raisedAmount",
      "raisedPercentage",
      "startDate",
      "endDate",
      "donationLink",
      "blessingMessage",
    ],
    appBody:
      "🙏 Om Namah Shivaya 🙏\n\n{{templeName}} is organizing a new donation campaign.\n\n📢 Campaign\n{{campaignTitle}}\n\n📝 Description\n{{campaignDescription}}\n\n🎯 Goal\n{{goalAmount}}\n\n📈 Raised\n{{raisedAmount}} ({{raisedPercentage}}%)\n\n📅 Campaign Period\n{{startDate}} - {{endDate}}\n\n❤️ Support this sacred cause.\n🔗 Donate Now\n{{donationLink}}\n\n{{blessingMessage}}",
  },
  {
    templateKey: "donation_campaign_broadcast",
    language: "te",
    metaTemplateName: "donation_campaign_broadcast",
    metaCategory: "UTILITY",
    variables: [
      "templeName",
      "campaignTitle",
      "campaignDescription",
      "goalAmount",
      "raisedAmount",
      "raisedPercentage",
      "startDate",
      "endDate",
      "donationLink",
      "blessingMessage",
    ],
    appBody:
      "🙏 ఓం నమః శివాయ 🙏\n\n{{templeName}} ఒక కొత్త విరాళ కార్యక్రమాన్ని నిర్వహిస్తోంది.\n\n📢 కార్యక్రమం\n{{campaignTitle}}\n\n📝 వివరణ\n{{campaignDescription}}\n\n🎯 లక్ష్యం\n{{goalAmount}}\n\n📈 సేకరించినది\n{{raisedAmount}} ({{raisedPercentage}}%)\n\n📅 కార్యక్రమ వ్యవధి\n{{startDate}} - {{endDate}}\n\n❤️ ఈ పవిత్ర కార్యానికి మద్దతు ఇవ్వండి.\n🔗 ఇప్పుడు విరాళం ఇవ్వండి\n{{donationLink}}\n\n{{blessingMessage}}",
  },
];

/** 14 standard template keys × {en, te} = 28 entries. Bootstrapped automatically on WhatsApp connect/reconnect — see lib/whatsapp/template-bootstrap.ts. */
export const STANDARD_TEMPLATE_CATALOG: StandardTemplateCatalogEntry[] = CATALOG_SOURCE.map((entry) => ({
  ...entry,
  description: `Standard TempleOS template for "${entry.templateKey}" (${entry.language}). Recommended starting point — adjust category/body/variables as needed before submitting in Meta Business Manager.`,
}));
