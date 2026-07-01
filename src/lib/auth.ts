import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@farcaster/quick-auth";
import { SiweMessage, generateNonce } from "siwe";
import { getDatabase, databaseRequired, type DbClient } from "@/lib/api";
import { csrfCheck } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { authLogger } from "@/lib/logger";
import { readIsVaultAdmin } from "@/lib/contract-reads";

export type AuthUser = {
  address: string;
  role: "user" | "admin";
  fid?: number;
};

const SESSION_COOKIE = "vault_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isFarcasterAddress(address: string) {
  return address.startsWith("farcaster:");
}

function farcasterAddress(fid: number) {
  return `farcaster:${fid}`;
}

export function isEvmAddress(address: unknown): address is `0x${string}` {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function actorAddressForRequest(user: AuthUser, walletAddress: unknown) {
  if (user.role !== "admin") {
    if (isFarcasterAddress(user.address) && isEvmAddress(walletAddress)) {
      return walletAddress.toLowerCase();
    }
    return user.address;
  }
  return isEvmAddress(walletAddress) ? walletAddress.toLowerCase() : user.address;
}

async function isOnchainAdmin(address: string) {
  if (!isEvmAddress(address)) return false;
  return readIsVaultAdmin(address).catch(() => false);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${randomBytes(12).toString("hex")}`;
}

function farcasterAuthDomains(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host") || "";
  const host = req.headers.get("host") || "";
  const envHost = process.env.NEXT_PUBLIC_URL
    ? new URL(process.env.NEXT_PUBLIC_URL).host
    : "";

  // Quick Auth JWT audience is the SIWF domain, which matches URL.host.
  // Keep the port for local/tunnel URLs; using URL.hostname breaks localhost:3000.
  return uniqueValues([forwardedHost, host, envHost].map((domain) => domain.toLowerCase()));
}

async function consumeNonce(db: DbClient, nonce: string) {
  const nonceRows = await db`
    SELECT * FROM auth_nonces
    WHERE nonce = ${nonce} AND consumed_at IS NULL AND expires_at > NOW()
    LIMIT 1
  ` as Record<string, unknown>[];

  return nonceRows.length > 0;
}

async function createSession(db: DbClient, addressInput: string, chainId?: number) {
  const address = addressInput.toLowerCase();
  const role = await isOnchainAdmin(address) ? "admin" : "user";
  await db`INSERT INTO users (address, role) VALUES (${address}, ${role})
    ON CONFLICT (address) DO UPDATE SET role = ${role}`;

  const sessionId = newId("S");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db`INSERT INTO sessions (id, address, role, expires_at) VALUES (${sessionId}, ${address}, ${role}, ${expires})`;

  const res = NextResponse.json({ address, chainId, role });
  res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions(expires));
  authLogger("login", address, { role });
  return res;
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

export async function createSiweSession(req: NextRequest) {
  const guarded = await mutationGuard(req);
  if (guarded) return guarded;

  const db = getDatabase();
  if (!db) return databaseRequired();

  const { message, signature } = await req.json();
  const siweMessage = new SiweMessage(message);
  const nonce = String(siweMessage.nonce || "");

  if (!(await consumeNonce(db, nonce))) {
    return NextResponse.json({ error: "Nonce is invalid or expired" }, { status: 401 });
  }

  const domain = req.headers.get("host") || undefined;
  const { success, data } = await siweMessage.verify({ signature, nonce, domain });
  if (!success || !data.address) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const address = data.address.toLowerCase();
  await db`UPDATE auth_nonces SET consumed_at = NOW(), address = ${address} WHERE nonce = ${nonce}`;
  return createSession(db, address, data.chainId);
}

export async function createFarcasterQuickAuthSession(req: NextRequest) {
  const guarded = await mutationGuard(req);
  if (guarded) return guarded;

  const db = getDatabase();
  if (!db) return databaseRequired();

  const { token, walletAddress, chainId } = await req.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Quick Auth token is required" }, { status: 400 });
  }

  const domains = farcasterAuthDomains(req);
  if (domains.length === 0) {
    return NextResponse.json({ error: "Missing request host" }, { status: 400 });
  }

  const quickAuth = createClient({
    origin: process.env.FARCASTER_QUICK_AUTH_ORIGIN || "https://auth.farcaster.xyz",
  });

  try {
    let payload: Awaited<ReturnType<typeof quickAuth.verifyJwt>> | null = null;
    let lastError: unknown;
    for (const domain of domains) {
      try {
        payload = await quickAuth.verifyJwt({
          domain,
          token,
        });
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!payload) throw lastError;

    const fid = Number(payload.sub);
    if (!Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json({ error: "Invalid Farcaster user" }, { status: 401 });
    }

    const sessionAddress = isEvmAddress(walletAddress)
      ? walletAddress.toLowerCase()
      : farcasterAddress(fid);
    const sessionChainId = Number.isFinite(Number(chainId)) ? Number(chainId) : undefined;
    return createSession(db, sessionAddress, sessionChainId);
  } catch (err) {
    console.warn("[auth/farcaster] Quick Auth sign-in failed", {
      domains,
      error: err,
    });
    return NextResponse.json({ error: "Invalid Farcaster token" }, { status: 401 });
  }
}

export async function destroySession(req: NextRequest) {
  const guarded = await mutationGuard(req);
  if (guarded) return guarded;

  const db = getDatabase();
  if (!db) return databaseRequired();
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db`DELETE FROM sessions WHERE id = ${sessionId}`;
    authLogger("logout", undefined, { session_id: sessionId });
  }
  return clearSessionCookie(NextResponse.json({ ok: true }));
}

export async function getSession(req: NextRequest): Promise<AuthUser | null> {
  const db = getDatabase();
  if (!db) return null;
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const rows = await db`
    SELECT s.address
    FROM sessions s
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const address = String(rows[0].address || "").toLowerCase();
  const role = await isOnchainAdmin(address) ? "admin" : "user";
  const fid = isFarcasterAddress(address) ? Number(address.replace("farcaster:", "")) : undefined;
  return { address, role, fid: Number.isFinite(fid) ? fid : undefined };
}

export async function getSessionResponse(req: NextRequest) {
  const user = await getSession(req);
  return NextResponse.json({ user });
}

export async function mutationGuard(req: NextRequest) {
  const rate = await rateLimit(req);
  if (rate.status !== 200) return rate;
  const csrf = csrfCheck(req);
  if (csrf.status !== 200) return csrf;
  return null;
}

export async function requireUser(req: NextRequest): Promise<{ user: AuthUser; db: DbClient } | { response: NextResponse }> {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const guarded = await mutationGuard(req);
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

export async function rotateSession(req: NextRequest, currentUser: AuthUser): Promise<NextResponse | null> {
  const db = getDatabase();
  if (!db) return null;

  const oldSessionId = req.cookies.get(SESSION_COOKIE)?.value;

  const sessionId = newId("S");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db`INSERT INTO sessions (id, address, role, expires_at) VALUES (${sessionId}, ${currentUser.address}, ${currentUser.role}, ${expires})`;

  if (oldSessionId) {
    await db`DELETE FROM sessions WHERE id = ${oldSessionId}`;
  }

  const res = new NextResponse();
  res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions(expires));
  authLogger("session_rotated", currentUser.address);
  return res;
}
