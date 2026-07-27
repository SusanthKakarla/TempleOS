import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { constantTimeEqual, decryptSecret, encryptSecret } from "./crypto";

describe("payment credential encryption", () => {
  const ORIGINAL_KEY = process.env.PAYMENT_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips a secret through encrypt/decrypt", () => {
    const secret = "rzp_test_supersecretkey1234567890";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each call (fresh IV) even for the same plaintext", () => {
    const secret = "same-secret";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("throws when the encryption key is missing", () => {
    delete process.env.PAYMENT_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow("PAYMENT_ENCRYPTION_KEY is not set");
  });

  it("throws when the key doesn't decode to 32 bytes", () => {
    process.env.PAYMENT_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptSecret("x")).toThrow("32 bytes");
  });

  it("fails to decrypt a tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = encryptSecret("a-real-secret");
    const [iv, authTag, ciphertext] = encrypted.split(".");
    const tamperedCiphertext = Buffer.from(ciphertext, "base64");
    tamperedCiphertext[0] ^= 0xff;
    const tampered = `${iv}.${authTag}.${tamperedCiphertext.toString("base64")}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects a malformed (non-3-part) encrypted value", () => {
    expect(() => decryptSecret("not-a-valid-encrypted-value")).toThrow("Malformed");
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEqual("abc123", "abc124")).toBe(false);
  });

  it("returns false for strings of different lengths without throwing", () => {
    expect(constantTimeEqual("short", "a-much-longer-string")).toBe(false);
  });
});
