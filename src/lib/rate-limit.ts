import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/api";

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;   // per window

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function inMemoryRateLimit(key: string) {
  const now = Date.now();
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

export async function rateLimit(req: NextRequest) {
  const key = `rate:${clientIp(req)}`;
  const db = getDatabase();
  if (!db) return inMemoryRateLimit(key);

  const resetAt = new Date(Date.now() + WINDOW_MS);
  const rows = await db`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < NOW() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < NOW() THEN ${resetAt} ELSE rate_limits.reset_at END
    RETURNING count, reset_at
  ` as Record<string, unknown>[];

  const count = Number(rows[0]?.count || 1);
  if (count > MAX_REQUESTS) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return NextResponse.next();
}

// Cleanup stale entries every 5 minutes (in-memory + DB)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of RATE_LIMIT) {
      if (now > entry.resetAt) RATE_LIMIT.delete(key);
    }
    // Cleanup stale DB rows older than 1 hour
    const db = getDatabase();
    if (db) {
      db`DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour'`.catch(() => {});
    }
  }, 300_000);
}
