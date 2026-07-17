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
    expect(classifyCommand("3")).toBe("unknown");
    expect(classifyCommand("🙏")).toBe("unknown");
  });

  it("does not hallucinate a match for partial/loose text", () => {
    expect(classifyCommand("hi there")).toBe("unknown");
    expect(classifyCommand("event")).toBe("unknown");
  });
});
