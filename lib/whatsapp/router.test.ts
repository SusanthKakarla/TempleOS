import { describe, expect, it } from "vitest";
import { classifyCommand } from "./router";

describe("classifyCommand", () => {
  it("classifies numeric and word commands for events", () => {
    expect(classifyCommand("1")).toBe("events");
    expect(classifyCommand("events")).toBe("events");
    expect(classifyCommand("Events")).toBe("events");
    expect(classifyCommand("  1  ")).toBe("events");
  });

  it("classifies numeric and word commands for contact", () => {
    expect(classifyCommand("2")).toBe("contact");
    expect(classifyCommand("contact")).toBe("contact");
    expect(classifyCommand("CONTACT")).toBe("contact");
  });

  it("classifies numeric and word commands for timings", () => {
    expect(classifyCommand("3")).toBe("timings");
    expect(classifyCommand("timings")).toBe("timings");
    expect(classifyCommand("hours")).toBe("timings");
  });

  it("classifies numeric and word commands for history", () => {
    expect(classifyCommand("4")).toBe("history");
    expect(classifyCommand("history")).toBe("history");
    expect(classifyCommand("about")).toBe("history");
  });

  it("classifies numeric and word commands for sevas", () => {
    expect(classifyCommand("5")).toBe("sevas");
    expect(classifyCommand("sevas")).toBe("sevas");
    expect(classifyCommand("services")).toBe("sevas");
  });

  it("classifies numeric and word commands for faq", () => {
    expect(classifyCommand("6")).toBe("faq");
    expect(classifyCommand("faq")).toBe("faq");
    expect(classifyCommand("questions")).toBe("faq");
  });

  it("classifies greetings and empty input as menu", () => {
    expect(classifyCommand("hi")).toBe("menu");
    expect(classifyCommand("Hi!")).toBe("menu");
    expect(classifyCommand("namaste")).toBe("menu");
    expect(classifyCommand("menu")).toBe("menu");
    expect(classifyCommand("")).toBe("menu");
    expect(classifyCommand(null)).toBe("menu");
    expect(classifyCommand(undefined)).toBe("menu");
  });

  it("falls back to unknown for anything else", () => {
    expect(classifyCommand("what time is aarti today")).toBe("unknown");
    expect(classifyCommand("7")).toBe("unknown");
    expect(classifyCommand("🙏")).toBe("unknown");
  });

  it("does not hallucinate a match for partial/loose text", () => {
    expect(classifyCommand("hi there")).toBe("unknown");
    expect(classifyCommand("event")).toBe("unknown");
  });
});
