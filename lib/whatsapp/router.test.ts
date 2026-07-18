import { describe, expect, it } from "vitest";
import { classifyCommand, classifyInteractiveReplyId } from "./router";

describe("classifyCommand", () => {
  it("classifies numeric and word commands for events", () => {
    expect(classifyCommand("1")).toBe("events");
    expect(classifyCommand("events")).toBe("events");
    expect(classifyCommand("Events")).toBe("events");
    expect(classifyCommand("  1  ")).toBe("events");
    expect(classifyCommand("కార్యక్రమాలు")).toBe("events");
  });

  it("classifies numeric and word commands for contact", () => {
    expect(classifyCommand("2")).toBe("contact");
    expect(classifyCommand("contact")).toBe("contact");
    expect(classifyCommand("CONTACT")).toBe("contact");
    expect(classifyCommand("సంప్రదించండి")).toBe("contact");
  });

  it("classifies numeric and word commands for timings", () => {
    expect(classifyCommand("3")).toBe("timings");
    expect(classifyCommand("timings")).toBe("timings");
    expect(classifyCommand("hours")).toBe("timings");
    expect(classifyCommand("సమయాలు")).toBe("timings");
  });

  it("classifies numeric and word commands for history", () => {
    expect(classifyCommand("4")).toBe("history");
    expect(classifyCommand("history")).toBe("history");
    expect(classifyCommand("about")).toBe("history");
    expect(classifyCommand("చరిత్ర")).toBe("history");
  });

  it("classifies numeric and word commands for sevas", () => {
    expect(classifyCommand("5")).toBe("sevas");
    expect(classifyCommand("sevas")).toBe("sevas");
    expect(classifyCommand("services")).toBe("sevas");
    expect(classifyCommand("సేవలు")).toBe("sevas");
  });

  it("classifies numeric and word commands for faq", () => {
    expect(classifyCommand("6")).toBe("faq");
    expect(classifyCommand("faq")).toBe("faq");
    expect(classifyCommand("questions")).toBe("faq");
    expect(classifyCommand("ప్రశ్నలు")).toBe("faq");
  });

  it("classifies numeric and word commands for donation info", () => {
    expect(classifyCommand("7")).toBe("donation_info");
    expect(classifyCommand("donate")).toBe("donation_info");
    expect(classifyCommand("donation")).toBe("donation_info");
    expect(classifyCommand("విరాళం")).toBe("donation_info");
  });

  it("classifies numeric and word commands for change_language", () => {
    expect(classifyCommand("8")).toBe("change_language");
    expect(classifyCommand("language")).toBe("change_language");
    expect(classifyCommand("Language")).toBe("change_language");
    expect(classifyCommand("భాష")).toBe("change_language");
  });

  it("classifies help in both languages", () => {
    expect(classifyCommand("help")).toBe("help");
    expect(classifyCommand("HELP")).toBe("help");
    expect(classifyCommand("సహాయం")).toBe("help");
  });

  it("classifies greetings and empty input as menu, including Telugu greetings", () => {
    expect(classifyCommand("hi")).toBe("menu");
    expect(classifyCommand("Hi!")).toBe("menu");
    expect(classifyCommand("namaste")).toBe("menu");
    expect(classifyCommand("menu")).toBe("menu");
    expect(classifyCommand("మెను")).toBe("menu");
    expect(classifyCommand("హోమ్")).toBe("menu");
    expect(classifyCommand("వెనుకకు")).toBe("menu");
    expect(classifyCommand("")).toBe("menu");
    expect(classifyCommand(null)).toBe("menu");
    expect(classifyCommand(undefined)).toBe("menu");
  });

  it("falls back to unknown for anything else", () => {
    expect(classifyCommand("what time is aarti today")).toBe("unknown");
    expect(classifyCommand("9")).toBe("unknown");
    expect(classifyCommand("🙏")).toBe("unknown");
  });

  it("does not hallucinate a match for partial/loose text", () => {
    expect(classifyCommand("hi there")).toBe("unknown");
    expect(classifyCommand("event")).toBe("unknown");
  });
});

describe("classifyInteractiveReplyId", () => {
  it("classifies every known list row and button id", () => {
    expect(classifyInteractiveReplyId("events")).toBe("events");
    expect(classifyInteractiveReplyId("contact")).toBe("contact");
    expect(classifyInteractiveReplyId("timings")).toBe("timings");
    expect(classifyInteractiveReplyId("history")).toBe("history");
    expect(classifyInteractiveReplyId("sevas")).toBe("sevas");
    expect(classifyInteractiveReplyId("faq")).toBe("faq");
    expect(classifyInteractiveReplyId("donation_info")).toBe("donation_info");
    expect(classifyInteractiveReplyId("change_language")).toBe("change_language");
    expect(classifyInteractiveReplyId("lang_en")).toBe("select_language_en");
    expect(classifyInteractiveReplyId("lang_te")).toBe("select_language_te");
  });

  it("falls back to unknown for an unrecognized or missing id", () => {
    expect(classifyInteractiveReplyId("something_else")).toBe("unknown");
    expect(classifyInteractiveReplyId(null)).toBe("unknown");
    expect(classifyInteractiveReplyId(undefined)).toBe("unknown");
  });
});
