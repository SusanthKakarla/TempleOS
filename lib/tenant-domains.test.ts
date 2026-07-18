import { describe, expect, it } from "vitest";
import { normalizeTenantHostname } from "./tenant-domains";

describe("normalizeTenantHostname", () => {
  it("normalizes a full hostname", () => {
    expect(normalizeTenantHostname("HTTPS://SVTemple.TryTempleOS.com:443/login?x=1")).toBe(
      "svtemple.trytempleos.com",
    );
  });

  it("normalizes a bare hostname", () => {
    expect(normalizeTenantHostname("  SVTemple.TryTempleOS.com  ")).toBe(
      "svtemple.trytempleos.com",
    );
  });

  it("rejects blank or invalid hostnames", () => {
    expect(normalizeTenantHostname("")).toBeNull();
    expect(normalizeTenantHostname("not a host")).toBeNull();
  });

  it("rejects malformed or IP-like hostnames", () => {
    expect(normalizeTenantHostname("foo..trytempleos.com")).toBeNull();
    expect(normalizeTenantHostname("foo.trytempleos.com.")).toBeNull();
    expect(normalizeTenantHostname("bad_host.trytempleos.com")).toBeNull();
    expect(normalizeTenantHostname("-bad.trytempleos.com")).toBeNull();
    expect(normalizeTenantHostname("bad-.trytempleos.com")).toBeNull();
    expect(normalizeTenantHostname("127.0.0.1")).toBeNull();
  });
});
