import type { LocaleDictionary } from "./types";

export const en: LocaleDictionary = {
  menuGreetingFallback: "Namaste. Welcome to {temple}.",
  menuButtonLabel: "Menu",
  menuSectionTitle: "Options",
  menuRowEventsTitle: "Events",
  menuRowEventsDescription: "Upcoming temple events",
  menuRowContactTitle: "Contact",
  menuRowContactDescription: "Phone, address, map",
  menuRowTimingsTitle: "Timings",
  menuRowTimingsDescription: "Today's opening hours",
  menuRowHistoryTitle: "History",
  menuRowHistoryDescription: "About our temple",
  menuRowSevasTitle: "Sevas",
  menuRowSevasDescription: "Poojas and rituals offered",
  menuRowFaqTitle: "FAQ",
  menuRowFaqDescription: "Common questions",
  menuRowDonationInfoTitle: "Donate",
  menuRowDonationInfoDescription: "How to contribute",
  menuRowChangeLanguageTitle: "Language",
  menuRowChangeLanguageDescription: "Switch English / Telugu",

  eventsEmpty: "There are no upcoming events published right now. Please check again later.",
  eventsHeader: "Upcoming events at {temple}:",
  eventsFooter: 'Reply "menu" to go back.',

  contactFallbackPhone: "the temple office",
  contactEmailLabel: "Email",
  contactDirectionsLabel: "Directions",

  unknownMessage: 'Sorry, I did not understand. Reply "menu" to see options.',

  timingsClosedForOccasion: "{temple} is closed today for {occasion}.",
  timingsNotConfigured: "Temple timings have not been configured yet. Please contact the temple office.",
  timingsHeader: "{temple} timings:",
  timingsHeaderWithOccasion: "{temple} timings ({occasion}):",
  timingsMorningLabel: "Morning:",
  timingsEveningLabel: "Evening:",

  historyFallback: "Temple history has not been added yet. Please contact the temple office.",

  sevasEmpty: "No sevas are listed yet. Please contact the temple office for seva information.",
  sevasHeader: "Sevas at {temple}:",
  sevasAvailableLabel: "Available",
  sevasTrailer: "\n\n...and more. Contact the temple office for the full list.",

  faqEmpty: "No frequently asked questions have been added yet. Please contact the temple office.",
  faqHeader: "Frequently asked questions:",
  faqTrailer: "\n\nMore questions? Contact the temple office.",

  donationInfoFallback: "Donation information has not been added yet. Please contact the temple office.",
  helpBody:
    'Namaste! Here is how to use this chatbot:\n\n' +
    'Reply with a number, or type a word like "events" or "timings".\n' +
    'Type "menu" anytime to see all options.\n' +
    'Type "language" to switch between English and Telugu.\n\n' +
    "A temple volunteer is also happy to help — see the Contact option in the menu.",

  dayMonday: "Monday",
  dayTuesday: "Tuesday",
  dayWednesday: "Wednesday",
  dayThursday: "Thursday",
  dayFriday: "Friday",
  daySaturday: "Saturday",
  daySunday: "Sunday",

  languagePickerBody: "🙏 Welcome! Please choose your preferred language.\nదయచేసి మీ భాషను ఎంచుకోండి.",
  languagePickerButtonEnglish: "English",
  languagePickerButtonTelugu: "తెలుగు",

  notifyNewEventIntro: "🙏 Namaste. {temple} has announced a new event: *{title}*, on {date} at {time}.",
  notifyEventUpdatedIntro: "🔔 The event *{title}* at {temple} has been updated. New date/time: {date} at {time}.",
  notifyEventCancelledIntro: "⚠️ The event *{title}* at {temple} has been cancelled. We apologize for the inconvenience.",
  notifyLocationLine: "📍 {location}",
  notifyFooter: "Tap below for more, or reply \"menu\" anytime.",
  notifyViewEventButton: "View Events",
  notifyMainMenuButton: "Main Menu",
  notifyContactButton: "Contact Us",
};
