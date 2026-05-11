import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  "https://vault-fi.vercel.app",
];

export function cors(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
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
  const host = req.headers.get("host");

  if (!origin && !host) return NextResponse.next(); // server-to-server

  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  return NextResponse.next();
}
