import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSslConfig } from "./pool";

describe("buildSslConfig", () => {
  const ORIGINAL_CA_CERT = process.env.DATABASE_CA_CERT;

  beforeEach(() => {
    delete process.env.DATABASE_CA_CERT;
  });

  afterEach(() => {
    if (ORIGINAL_CA_CERT === undefined) {
      delete process.env.DATABASE_CA_CERT;
    } else {
      process.env.DATABASE_CA_CERT = ORIGINAL_CA_CERT;
    }
  });

  it("disables SSL entirely for local/private connection strings", () => {
    expect(buildSslConfig("postgresql://user:pass@localhost:5432/db")).toBe(false);
    expect(buildSslConfig("postgresql://user:pass@127.0.0.1:5432/db")).toBe(false);
    expect(buildSslConfig("postgresql://user:pass@postgres.railway.internal:5432/db")).toBe(false);
  });

  it("defaults to encrypted-but-unverified for public hosts when no CA cert is configured", () => {
    expect(buildSslConfig("postgresql://user:pass@db.example.com:5432/db")).toEqual({ rejectUnauthorized: false });
  });

  it("opts into full certificate verification once DATABASE_CA_CERT is set", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\nMII...\n-----END CERTIFICATE-----";
    expect(buildSslConfig("postgresql://user:pass@db.example.com:5432/db")).toEqual({
      ca: process.env.DATABASE_CA_CERT,
      rejectUnauthorized: true,
    });
  });
});
