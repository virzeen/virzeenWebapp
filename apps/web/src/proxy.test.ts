import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// The proxy reads its settings when the module loads, so each case imports it fresh.
async function loadProxy(siteUrl: string) {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  vi.resetModules();
  return (await import("./proxy")).proxy;
}

// Behind Railway the server sees its own address in the URL; only the Host header says what the visitor typed.
const request = (host: string, path = "/shop?sort=new") =>
  new NextRequest(`http://localhost:8080${path}`, { headers: { host } });

afterEach(() => vi.unstubAllEnvs());

describe("proxy: the Railway address", () => {
  it("sends pages to the real domain, keeping the path and query", async () => {
    const proxy = await loadProxy("https://virzeen.com");
    const response = proxy(request("virzeenwebapp-production.up.railway.app"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://virzeen.com/shop?sort=new");
  });

  it("leaves the real domain alone", async () => {
    const proxy = await loadProxy("https://virzeen.com");
    const response = proxy(request("virzeen.com"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("doesn't redirect local development", async () => {
    const proxy = await loadProxy("http://localhost:3000");
    expect(proxy(request("something.up.railway.app")).status).toBe(200);
  });
});
