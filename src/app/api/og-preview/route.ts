import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/ssrf";

/**
 * Proxies a URL and extracts OG metadata.
 * GET /api/og-preview?url=https://...
 */
export async function GET(req: NextRequest) {
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
    await assertSafeUrl(decoded);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(decoded, {
      signal: controller.signal,
      headers: { "User-Agent": "VaultBot/1.0 (OG Preview)" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: `Page returned ${res.status}` }, { status: 200 });
    }

    const html = await res.text();

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
      url: decoded,
    });
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError"
      ? "Request timed out"
      : "Could not fetch URL";
    return NextResponse.json({ error: message }, { status: 200 });
  }
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
