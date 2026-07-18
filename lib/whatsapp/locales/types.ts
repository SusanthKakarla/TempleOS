/**
 * Every key the WhatsApp bot's chrome (menu labels, headers, fallback
 * strings) can be rendered in. A flat (not nested) interface so `t()`'s key
 * argument gets full string-literal autocomplete, and so adding a language
 * is "write a new file satisfying this interface" — TypeScript itself
 * rejects a translation file that's missing a key, no runtime check needed.
 *
 * This does NOT cover admin-authored CMS content (event titles, seva
 * descriptions, FAQ text, tenant.history/donationInfo/welcomeMessage) — that
 * is never machine-translated and renders as the admin typed it, in
 * whichever language that was. See migrations/006_language_support.sql.
 */
export interface LocaleDictionary {
  menuGreetingFallback: string; // params: temple
  menuButtonLabel: string;
  menuSectionTitle: string;
  menuRowEventsTitle: string;
  menuRowEventsDescription: string;
  menuRowContactTitle: string;
  menuRowContactDescription: string;
  menuRowTimingsTitle: string;
  menuRowTimingsDescription: string;
  menuRowHistoryTitle: string;
  menuRowHistoryDescription: string;
  menuRowSevasTitle: string;
  menuRowSevasDescription: string;
  menuRowFaqTitle: string;
  menuRowFaqDescription: string;
  menuRowDonationInfoTitle: string;
  menuRowDonationInfoDescription: string;
  menuRowChangeLanguageTitle: string;
  menuRowChangeLanguageDescription: string;

  eventsEmpty: string;
  eventsHeader: string; // params: temple
  eventsFooter: string;

  contactFallbackPhone: string;
  contactEmailLabel: string;
  contactDirectionsLabel: string;

  unknownMessage: string;

  announcementIntro: string; // params: temple, title, date, time
  announcementFooter: string;

  timingsClosedForOccasion: string; // params: temple, occasion
  timingsNotConfigured: string;
  timingsHeader: string; // params: temple
  timingsHeaderWithOccasion: string; // params: temple, occasion
  timingsMorningLabel: string;
  timingsEveningLabel: string;

  historyFallback: string;

  sevasEmpty: string;
  sevasHeader: string; // params: temple
  sevasAvailableLabel: string;
  sevasTrailer: string;

  faqEmpty: string;
  faqHeader: string;
  faqTrailer: string;

  donationInfoFallback: string;
  helpBody: string; // params: temple

  dayMonday: string;
  dayTuesday: string;
  dayWednesday: string;
  dayThursday: string;
  dayFriday: string;
  daySaturday: string;
  daySunday: string;

  languagePickerBody: string;
  languagePickerButtonEnglish: string;
  languagePickerButtonTelugu: string;
}
