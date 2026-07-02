import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
]);

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    out = (out << 8) + value;
  }
  return out >>> 0;
}

function inIpv4Cidr(ip: string, base: string, bits: number): boolean {
  const value = ipv4ToNumber(ip);
  const baseValue = ipv4ToNumber(base);
  if (value === null || baseValue === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

function embeddedMappedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  if (!lower.startsWith("::ffff:")) return null;
  const tail = lower.slice("::ffff:".length);
  if (isIP(tail) === 4) return tail;
  const hextets = tail.split(":");
  const hex = hextets.length === 2
    ? hextets.map((part) => part.padStart(4, "0")).join("")
    : tail.replace(":", "");
  if (!/^[0-9a-f]{8}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    parseInt(hex.slice(6, 8), 16),
  ].join(".");
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return (
      inIpv4Cidr(ip, "0.0.0.0", 8) ||
      inIpv4Cidr(ip, "10.0.0.0", 8) ||
      inIpv4Cidr(ip, "100.64.0.0", 10) ||
      inIpv4Cidr(ip, "127.0.0.0", 8) ||
      inIpv4Cidr(ip, "169.254.0.0", 16) ||
      inIpv4Cidr(ip, "172.16.0.0", 12) ||
      inIpv4Cidr(ip, "192.0.0.0", 24) ||
      inIpv4Cidr(ip, "192.0.2.0", 24) ||
      inIpv4Cidr(ip, "192.168.0.0", 16) ||
      inIpv4Cidr(ip, "198.18.0.0", 15) ||
      inIpv4Cidr(ip, "198.51.100.0", 24) ||
      inIpv4Cidr(ip, "203.0.113.0", 24) ||
      inIpv4Cidr(ip, "224.0.0.0", 4) ||
      inIpv4Cidr(ip, "240.0.0.0", 4)
    );
  }

  if (version === 6) {
    const mapped = embeddedMappedIpv4(ip);
    if (mapped) return isPrivateIp(mapped);
    const lower = ip.toLowerCase();
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    );
  }

  return true;
}

/**
 * Validates a URL is safe to fetch server-side.
 * Rejects private IPs, internal hostnames, and non-HTTP schemes.
 */
export async function assertSafeUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Block known internal hostnames
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error("Internal URLs are not allowed");
  }

  // If it's already an IP, check directly
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private IP ranges are not allowed");
    return;
  }

  // Resolve hostname to IP and check
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("URL resolves to a private IP range");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Private")) throw err;
    // DNS resolution failure is acceptable — let the actual fetch handle it
  }
}
