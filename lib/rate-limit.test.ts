import { describe, expect, it } from "vitest";
import { isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  it("allows requests under the default limit and blocks once the window is exceeded", () => {
    const key = `test-default-${Math.random()}`;
    for (let i = 0; i < 20; i++) {
      expect(isRateLimited(key)).toBe(false);
    }
    expect(isRateLimited(key)).toBe(true);
  });

  it("honors a caller-supplied maxRequests override, independent of the default", () => {
    const key = `test-override-${Math.random()}`;
    expect(isRateLimited(key, { maxRequests: 2 })).toBe(false);
    expect(isRateLimited(key, { maxRequests: 2 })).toBe(false);
    expect(isRateLimited(key, { maxRequests: 2 })).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;
    for (let i = 0; i < 20; i++) isRateLimited(keyA);
    expect(isRateLimited(keyA)).toBe(true);
    expect(isRateLimited(keyB)).toBe(false);
  });
});
