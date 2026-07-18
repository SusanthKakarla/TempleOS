import { describe, expect, it } from "vitest";
import { createFaqSchema, updateFaqSchema } from "./temple-faqs";

describe("createFaqSchema", () => {
  it("accepts a valid question and answer", () => {
    const result = createFaqSchema.safeParse({
      question: "What time does the temple open?",
      answer: "The temple opens at 6:00 AM.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank question", () => {
    expect(createFaqSchema.safeParse({ question: "  ", answer: "An answer" }).success).toBe(false);
  });

  it("rejects a blank answer", () => {
    expect(createFaqSchema.safeParse({ question: "A question?", answer: "" }).success).toBe(false);
  });
});

describe("updateFaqSchema", () => {
  it("allows a partial update with only the answer", () => {
    expect(updateFaqSchema.safeParse({ answer: "Updated answer" }).success).toBe(true);
  });

  it("allows an empty payload", () => {
    expect(updateFaqSchema.safeParse({}).success).toBe(true);
  });
});
