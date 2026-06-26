import { NextRequest, NextResponse } from "next/server";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("host");
  if (!host) return "";
  const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// CSRF check for mutating methods
export function csrfCheck(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Origin header is required" }, { status: 403 });
  }

  if (normalizeOrigin(origin) !== requestOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  return NextResponse.next();
}
