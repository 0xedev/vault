import { NextRequest, NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, createHmac, createHash, timingSafeEqual, randomBytes, scryptSync } from "crypto";
import { getDatabase, type DbClient } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";

const SECRET_ALGORITHM = "aes-256-gcm";
const SECRET_IV_LENGTH = 12;
const SECRET_TAG_LENGTH = 16;

export function generateApiKey(): { apiKey: string; secret: string } {
  const key = `vault_sk_${randomBytes(24).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  return { apiKey: key, secret };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function apiSecretRootKey() {
  const secret = process.env.API_KEY_ENCRYPTION_KEY || process.env.MESSAGE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("API_KEY_ENCRYPTION_KEY or MESSAGE_ENCRYPTION_KEY is required for API key secrets.");
  }
  return secret;
}

function deriveApiSecretKey(apiKey: string): Buffer {
  return scryptSync(apiSecretRootKey(), `vault-api-key:${apiKey}`, 32);
}

export function encryptApiSecret(apiKey: string, secret: string): string {
  const iv = randomBytes(SECRET_IV_LENGTH);
  const cipher = createCipheriv(SECRET_ALGORITHM, deriveApiSecretKey(apiKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptApiSecret(apiKey: string, ciphertext: string): string {
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, SECRET_IV_LENGTH);
  const tag = combined.subarray(SECRET_IV_LENGTH, SECRET_IV_LENGTH + SECRET_TAG_LENGTH);
  const encrypted = combined.subarray(SECRET_IV_LENGTH + SECRET_TAG_LENGTH);
  const decipher = createDecipheriv(SECRET_ALGORITHM, deriveApiSecretKey(apiKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function verifyHmacSignature(
  secret: string,
  method: string,
  path: string,
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  const payload = `${timestamp}${method}${path}${body}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
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

  const rows = await db`
    SELECT ak.*, u.status AS user_status
    FROM api_keys ak
    JOIN users u ON u.address = ak.user_address
    WHERE ak.api_key = ${apiKey}
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) {
    return { response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  const userStatus = String(rows[0].user_status || "active");
  if (userStatus === "banned") {
    return { response: NextResponse.json({ error: "Account is banned" }, { status: 403 }) };
  }
  if (userStatus === "frozen" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return { response: NextResponse.json({ error: "Account is frozen" }, { status: 403 }) };
  }

  const body = await req.clone().text().catch(() => "");
  const path = req.nextUrl.pathname + req.nextUrl.search;

  const secretCiphertext = rows[0].secret_ciphertext;
  if (typeof secretCiphertext !== "string" || secretCiphertext.length === 0) {
    return { response: NextResponse.json({ error: "API key must be regenerated before HMAC use" }, { status: 401 }) };
  }

  let secret: string;
  try {
    secret = decryptApiSecret(apiKey, secretCiphertext);
  } catch {
    return { response: NextResponse.json({ error: "API key secret is unreadable" }, { status: 401 }) };
  }

  if (hashSecret(secret) !== String(rows[0].secret_hash)) {
    return { response: NextResponse.json({ error: "API key secret integrity check failed" }, { status: 401 }) };
  }

  if (!verifyHmacSignature(secret, req.method, path, body, ts, sig)) {
    return { response: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  const passHash = createHash("sha256").update(passphrase).digest("hex");
  if (passHash !== String(rows[0].passphrase_hash)) {
    return { response: NextResponse.json({ error: "Invalid passphrase" }, { status: 401 }) };
  }

  await db`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${String(rows[0].id)}`;

  return {
    user: { address: String(rows[0].user_address), role: "user" as const, status: userStatus as AuthUser["status"] },
    db,
  };
}
