import { describe, expect, it } from "vitest";
import { socialPlatformSchema, upsertSocialLinkSchema } from "./temple-social-links";

describe("socialPlatformSchema", () => {
  it("accepts known platforms", () => {
    expect(socialPlatformSchema.safeParse("facebook").success).toBe(true);
    expect(socialPlatformSchema.safeParse("instagram").success).toBe(true);
    expect(socialPlatformSchema.safeParse("other").success).toBe(true);
  });

  it("rejects an unknown platform", () => {
    expect(socialPlatformSchema.safeParse("myspace").success).toBe(false);
  });
});

describe("upsertSocialLinkSchema", () => {
  it("accepts a valid URL", () => {
    expect(upsertSocialLinkSchema.safeParse({ url: "https://facebook.com/mytemple" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid URL", () => {
    expect(upsertSocialLinkSchema.safeParse({ url: "not-a-url" }).success).toBe(false);
  });

  it("rejects a missing URL", () => {
    expect(upsertSocialLinkSchema.safeParse({}).success).toBe(false);
  });
});
