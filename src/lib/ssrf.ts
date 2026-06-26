import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
]);

const PRIVATE_RANGES = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^fc00:/, /^fe80:/,
] as const;

function isPrivateIp(ip: string): boolean {
  if (BLOCKED_HOSTS.has(ip)) return true;
  return PRIVATE_RANGES.some((r) => r.test(ip));
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

  const host = url.hostname.toLowerCase();

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
    const records = await lookup(host, { family: 0 });
    if (records.address && isPrivateIp(records.address)) {
      throw new Error("URL resolves to a private IP range");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Private")) throw err;
    // DNS resolution failure is acceptable — let the actual fetch handle it
  }
}
