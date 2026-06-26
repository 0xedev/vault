import { NextRequest, NextResponse } from "next/server";
import { createHmac, createHash, timingSafeEqual, randomBytes } from "crypto";
import { getDatabase, type DbClient } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";

export function generateApiKey(): { apiKey: string; secret: string } {
  const key = `vault_sk_${randomBytes(24).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  return { apiKey: key, secret };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyHmacSignature(
  secretHash: string,
  method: string,
  path: string,
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  const payload = `${timestamp}${method}${path}${body}`;
  const expected = createHmac("sha256", secretHash).update(payload).digest("hex");
  try {
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function requireApiKey(req: NextRequest): Promise<{ user: AuthUser; db: DbClient } | { response: NextResponse }> {
  const apiKey = req.headers.get("x-vault-api-key");
  const ts = req.headers.get("x-vault-timestamp");
  const sig = req.headers.get("x-vault-signature");
  const passphrase = req.headers.get("x-vault-passphrase") || "";

  if (!apiKey || !ts || !sig) {
    return { response: NextResponse.json({ error: "Missing API auth headers: x-vault-api-key, x-vault-timestamp, x-vault-signature" }, { status: 401 }) };
  }

  const now = Date.now();
  const reqTime = parseInt(ts);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 30_000) {
    return { response: NextResponse.json({ error: "Timestamp expired or invalid" }, { status: 401 }) };
  }

  const db = getDatabase();
  if (!db) return { response: NextResponse.json({ error: "Database unavailable" }, { status: 503 }) };

  const rows = await db`SELECT * FROM api_keys WHERE api_key = ${apiKey} LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) {
    return { response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  const body = await req.clone().text().catch(() => "");
  const path = req.nextUrl.pathname + req.nextUrl.search;

  if (!verifyHmacSignature(String(rows[0].secret_hash), req.method, path, body, ts, sig)) {
    return { response: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  const passHash = createHash("sha256").update(passphrase).digest("hex");
  if (passHash !== String(rows[0].passphrase_hash)) {
    return { response: NextResponse.json({ error: "Invalid passphrase" }, { status: 401 }) };
  }

  await db`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${String(rows[0].id)}`;

  return {
    user: { address: String(rows[0].user_address), role: "user" as const },
    db,
  };
}
