import { BlockList, isIPv4, isIPv6 } from "node:net";

// Cloudflare's edge ranges, from https://www.cloudflare.com/ips/ (checked 2026-09-28).
const CLOUDFLARE_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const cloudflare = new BlockList();
for (const range of CLOUDFLARE_RANGES) {
  const [network = "", prefix] = range.split("/");
  cloudflare.addSubnet(network, Number(prefix), isIPv6(network) ? "ipv6" : "ipv4");
}

const isIp = (value: string | undefined): value is string => !!value && (isIPv4(value) || isIPv6(value));
const isCloudflare = (ip: string) => cloudflare.check(ip, isIPv6(ip) ? "ipv6" : "ipv4");

/** Set by app/api/auth/[...all]/route.ts from trustedClientIp(); the only IP header Better Auth reads. */
export const CLIENT_IP_HEADER = "x-vz-client-ip";

/**
 * The visitor's IP, or null when there is none. Railway's edge sets X-Forwarded-For and a visitor can't forge
 * its first entry. CF-Connecting-IP is trusted only when that entry is a Cloudflare edge, i.e. the request
 * really came through Cloudflare's proxy: anyone can send the header straight to Railway.
 */
export function trustedClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  if (!isIp(forwarded)) return null;
  const viaCloudflare = headers.get("cf-connecting-ip")?.trim();
  return isCloudflare(forwarded) && isIp(viaCloudflare) ? viaCloudflare : forwarded;
}

/** One customer controls a whole IPv6 /64, so rate limits key on the block, not the address. */
export function ipRateLimitKey(ip: string): string {
  if (!isIPv6(ip)) return ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  const [head = "", tail] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
