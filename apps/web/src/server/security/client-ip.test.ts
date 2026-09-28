import { describe, expect, it } from "vitest";
import { ipRateLimitKey, trustedClientIp } from "./client-ip";

const ip = (headers: Record<string, string>) => trustedClientIp(new Headers(headers));

describe("trustedClientIp", () => {
  it("takes the first X-Forwarded-For entry, which Railway's edge sets", () => {
    expect(ip({ "x-forwarded-for": "27.34.1.2" })).toBe("27.34.1.2");
    expect(ip({ "x-forwarded-for": "27.34.1.2, 100.64.0.7" })).toBe("27.34.1.2");
  });

  it("ignores CF-Connecting-IP sent straight to Railway", () => {
    expect(ip({ "x-forwarded-for": "27.34.1.2", "cf-connecting-ip": "9.9.9.9" })).toBe("27.34.1.2");
  });

  it("uses CF-Connecting-IP when the request came from a Cloudflare edge", () => {
    expect(ip({ "x-forwarded-for": "172.68.1.1, 100.64.0.7", "cf-connecting-ip": "27.34.1.2" })).toBe(
      "27.34.1.2",
    );
    expect(ip({ "x-forwarded-for": "2400:cb00:1::5", "cf-connecting-ip": "2001:db8::9" })).toBe(
      "2001:db8::9",
    );
  });

  it("keeps the Cloudflare edge when its CF-Connecting-IP isn't an IP", () => {
    expect(ip({ "x-forwarded-for": "172.68.1.1", "cf-connecting-ip": "nonsense" })).toBe("172.68.1.1");
  });

  it("falls back to X-Real-IP, then to nothing", () => {
    expect(ip({ "x-real-ip": "27.34.1.2" })).toBe("27.34.1.2");
    expect(ip({ "x-forwarded-for": "not-an-ip" })).toBeNull();
    expect(ip({})).toBeNull();
  });
});

describe("ipRateLimitKey", () => {
  it("keeps IPv4 as is", () => {
    expect(ipRateLimitKey("27.34.1.2")).toBe("27.34.1.2");
    expect(ipRateLimitKey("::ffff:27.34.1.2")).toBe("27.34.1.2");
  });

  it("groups IPv6 by /64", () => {
    const key = "2001:db8:abcd:12::/64";
    expect(ipRateLimitKey("2001:db8:abcd:12:1:2:3:4")).toBe(key);
    expect(ipRateLimitKey("2001:0DB8:ABCD:0012:ffff::1")).toBe(key);
    expect(ipRateLimitKey("2001:db8:abcd:12::")).toBe(key);
    expect(ipRateLimitKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipRateLimitKey("::1")).toBe("0:0:0:0::/64");
  });
});
