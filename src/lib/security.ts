import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  "https://vault-fi.vercel.app",
];

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

export function cors(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = NextResponse.next();

  const normalized = origin ? normalizeOrigin(origin) : "";
  if (normalized && ALLOWED_ORIGINS.some((o) => normalized === normalizeOrigin(o))) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return res;
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
