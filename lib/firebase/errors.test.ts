import { describe, expect, it } from "vitest";
import { getFirebaseErrorMessage } from "./errors";

describe("getFirebaseErrorMessage", () => {
  it("maps known Firebase Auth error codes to friendly messages", () => {
    expect(getFirebaseErrorMessage({ code: "auth/invalid-phone-number" }, "fallback")).toMatch(
      /valid phone number/i,
    );
    expect(getFirebaseErrorMessage({ code: "auth/too-many-requests" }, "fallback")).toMatch(
      /too many attempts/i,
    );
    expect(getFirebaseErrorMessage({ code: "auth/invalid-verification-code" }, "fallback")).toMatch(
      /doesn't look right/i,
    );
  });

  it("falls back to the error's own message for an unmapped Firebase code", () => {
    const err = { code: "auth/some-new-error", message: "Something specific happened" };
    expect(getFirebaseErrorMessage(err, "fallback")).toBe("fallback");
  });

  it("falls back to a plain Error's message when there is no Firebase code", () => {
    expect(getFirebaseErrorMessage(new Error("plain failure"), "fallback")).toBe("plain failure");
  });

  it("falls back to the provided default for non-Error values", () => {
    expect(getFirebaseErrorMessage("a string", "fallback")).toBe("fallback");
    expect(getFirebaseErrorMessage(null, "fallback")).toBe("fallback");
  });
});
