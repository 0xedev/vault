import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;   // per window

export function rateLimit(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const key = `rate:${ip}`;
  const entry = RATE_LIMIT.get(key);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  entry.count++;
  return NextResponse.next();
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of RATE_LIMIT) {
      if (now > entry.resetAt) RATE_LIMIT.delete(key);
    }
  }, 300_000);
}
