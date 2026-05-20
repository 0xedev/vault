import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SiweMessage, generateNonce } from "siwe";
import { getDatabase, databaseRequired, type DbClient } from "@/lib/api";
import { csrfCheck } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export type AuthUser = {
  address: string;
  role: "user" | "admin";
};

const SESSION_COOKIE = "vault_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;

function adminWallets() {
  return (process.env.ADMIN_WALLETS || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

function isBootstrapAdmin(address: string) {
  return adminWallets().includes(address.toLowerCase());
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${randomBytes(12).toString("hex")}`;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return res;
}

export async function createNonce() {
  const db = getDatabase();
  if (!db) return { response: databaseRequired() };

  const nonce = generateNonce();
  const expires = new Date(Date.now() + NONCE_TTL_MS);
  await db`INSERT INTO auth_nonces (nonce, expires_at) VALUES (${nonce}, ${expires})`;
  return { nonce };
}

export async function verifySiweSession(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const { message, signature } = await req.json();
  const siweMessage = new SiweMessage(message);
  const nonce = String(siweMessage.nonce || "");
  const nonceRows = await db`
    SELECT * FROM auth_nonces
    WHERE nonce = ${nonce} AND consumed_at IS NULL AND expires_at > NOW()
    LIMIT 1
  ` as Record<string, unknown>[];

  if (nonceRows.length === 0) {
    return NextResponse.json({ error: "Nonce is invalid or expired" }, { status: 401 });
  }

  const domain = req.headers.get("host") || undefined;
  const { success, data } = await siweMessage.verify({ signature, nonce, domain });
  if (!success || !data.address) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const address = data.address.toLowerCase();
  const role = isBootstrapAdmin(address) ? "admin" : "user";
  await db`UPDATE auth_nonces SET consumed_at = NOW(), address = ${address} WHERE nonce = ${nonce}`;
  await db`INSERT INTO users (address, role) VALUES (${address}, ${role})
    ON CONFLICT (address) DO UPDATE SET role = CASE
      WHEN users.role = 'admin' OR ${role} = 'admin' THEN 'admin'::user_role
      ELSE users.role
    END`;

  const sessionId = newId("S");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  const userRows = await db`SELECT role FROM users WHERE address = ${address} LIMIT 1` as Record<string, unknown>[];
  const effectiveRole = String(userRows[0]?.role || role) === "admin" ? "admin" : "user";
  await db`INSERT INTO sessions (id, address, role, expires_at) VALUES (${sessionId}, ${address}, ${effectiveRole}, ${expires})`;

  const res = NextResponse.json({ address, chainId: data.chainId, role: effectiveRole });
  res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions(expires));
  return res;
}

export async function destroySession(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) await db`DELETE FROM sessions WHERE id = ${sessionId}`;
  return clearSessionCookie(NextResponse.json({ ok: true }));
}

export async function getSession(req: NextRequest): Promise<AuthUser | null> {
  const db = getDatabase();
  if (!db) return null;
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const rows = await db`
    SELECT s.address, COALESCE(u.role, s.role) AS role
    FROM sessions s
    LEFT JOIN users u ON u.address = s.address
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const address = String(rows[0].address || "").toLowerCase();
  const role = String(rows[0].role || "user") === "admin" || isBootstrapAdmin(address) ? "admin" : "user";
  return { address, role };
}

export async function getSessionResponse(req: NextRequest) {
  const user = await getSession(req);
  return NextResponse.json({ user });
}

export function mutationGuard(req: NextRequest) {
  const rate = rateLimit(req);
  if (rate.status !== 200) return rate;
  const csrf = csrfCheck(req);
  if (csrf.status !== 200) return csrf;
  return null;
}

export async function requireUser(req: NextRequest): Promise<{ user: AuthUser; db: DbClient } | { response: NextResponse }> {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const guarded = mutationGuard(req);
    if (guarded) return { response: guarded };
  }
  const db = getDatabase();
  if (!db) return { response: databaseRequired() };
  const user = await getSession(req);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  return { user, db };
}

export async function requireAdmin(req: NextRequest): Promise<{ user: AuthUser; db: DbClient } | { response: NextResponse }> {
  const auth = await requireUser(req);
  if ("response" in auth) return auth;
  if (auth.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return auth;
}

export function forbidden(message = "Action is not available for this session.") {
  return NextResponse.json({ error: message }, { status: 403 });
}
