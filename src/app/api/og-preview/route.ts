import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/ssrf";
import { rateLimit } from "@/lib/rate-limit";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 1_000_000;

/**
 * Proxies a URL and extracts OG metadata.
 * GET /api/og-preview?url=https://...
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req);
  if (limited.status !== 200) return limited;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL encoding" }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(decoded)) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 });
  }

  try {
    const { res, finalUrl } = await fetchSafeHtml(decoded);

    if (!res.ok) {
      return NextResponse.json({ error: `Page returned ${res.status}` }, { status: 200 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json({ error: "URL did not return HTML" }, { status: 200 });
    }

    const html = await readLimitedText(res, MAX_HTML_BYTES);

    // Extract OG tags and title
    const ogImage = extractMeta(html, "og:image")
      || extractMeta(html, "twitter:image")
      || extractLinkRel(html, "image_src");
    const ogTitle = extractMeta(html, "og:title") || extractTag(html, "title");
    const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "description");
    const ogSite = extractMeta(html, "og:site_name");

    return NextResponse.json({
      image: ogImage || null,
      title: ogTitle || null,
      description: ogDesc || null,
      site: ogSite || null,
      url: finalUrl,
    });
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError"
      ? "Request timed out"
      : "Could not fetch URL";
    return NextResponse.json({ error: message }, { status: 200 });
  }
}

async function fetchSafeHtml(rawUrl: string) {
  let current = rawUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertSafeUrl(current);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "VaultBot/1.0 (OG Preview)" },
      });

      if (![301, 302, 303, 307, 308].includes(res.status)) {
        return { res, finalUrl: current };
      }

      const location = res.headers.get("location");
      if (!location) return { res, finalUrl: current };
      current = new URL(location, current).toString();
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects");
}

async function readLimitedText(res: Response, maxBytes: number) {
  const contentLength = Number(res.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Response is too large");
  }

  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Response is too large");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function extractMeta(html: string, property: string): string | null {
  // Match <meta property="..." content="..."> or <meta name="..." content="...">
  const propRe = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(propRe);
  if (match) return match[1];

  // reversed: content before property
  const revRe = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRe(property)}["']`,
    "i",
  );
  const revMatch = html.match(revRe);
  return revMatch ? revMatch[1] : null;
}

function extractLinkRel(html: string, rel: string): string | null {
  const re = new RegExp(
    `<link[^>]+rel=["']${escapeRe(rel)}["'][^>]+href=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(re);
  return match ? match[1] : null;
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i");
  const match = html.match(re);
  return match ? match[1].trim() : null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
