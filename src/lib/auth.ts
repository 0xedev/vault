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
  status: "active" | "frozen" | "banned";
  fid?: number;
  linkedWallets?: string[];
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
      const requested = walletAddress.toLowerCase();
      if (user.linkedWallets?.includes(requested)) return requested;
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
  const role = !isFarcasterAddress(address) && await isOnchainAdmin(address) ? "admin" : "user";
  await db`INSERT INTO users (address, role) VALUES (${address}, ${role})
    ON CONFLICT (address) DO UPDATE SET role = ${role}`;

  const users = await db`
    SELECT status FROM users WHERE address = ${address} LIMIT 1
  ` as Record<string, unknown>[];
  const status = String(users[0]?.status || "active") as AuthUser["status"];
  if (status === "banned") {
    await db`DELETE FROM sessions WHERE address = ${address}`;
    return NextResponse.json({ error: "Account is banned" }, { status: 403 });
  }

  const sessionId = newId("S");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db`INSERT INTO sessions (id, address, role, expires_at) VALUES (${sessionId}, ${address}, ${role}, ${expires})`;

  const res = NextResponse.json({ address, chainId, role, status });
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

export async function createFarcasterSignInNonce() {
  const quickAuth = createClient({
    origin: process.env.FARCASTER_QUICK_AUTH_ORIGIN || "https://auth.farcaster.xyz",
  });
  const result = await quickAuth.generateNonce();
  return { nonce: result.nonce };
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

  const body = await req.json();
  if (typeof body.message === "string" && typeof body.signature === "string") {
    return createFarcasterSiwfSessionFromBody(req, db, body.message, body.signature);
  }

  const { token, chainId } = body;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Farcaster SIWF message/signature or Quick Auth token is required" }, { status: 400 });
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

    const sessionChainId = Number.isFinite(Number(chainId)) ? Number(chainId) : undefined;
    return createSession(db, farcasterAddress(fid), sessionChainId);
  } catch (err) {
    console.warn("[auth/farcaster] Quick Auth sign-in failed", {
      domains,
      error: err,
    });
    return NextResponse.json({ error: "Invalid Farcaster token" }, { status: 401 });
  }
}

async function createFarcasterSiwfSessionFromBody(req: NextRequest, db: DbClient, message: string, signature: string) {
  const domains = farcasterAuthDomains(req);
  if (domains.length === 0) {
    return NextResponse.json({ error: "Missing request host" }, { status: 400 });
  }

  const quickAuth = createClient({
    origin: process.env.FARCASTER_QUICK_AUTH_ORIGIN || "https://auth.farcaster.xyz",
  });

  try {
    let token: string | null = null;
    let payload: Awaited<ReturnType<typeof quickAuth.verifyJwt>> | null = null;
    let lastError: unknown;
    for (const domain of domains) {
      try {
        const verified = await quickAuth.verifySiwf({ domain, message, signature });
        token = verified.token;
        payload = await quickAuth.verifyJwt({ domain, token });
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!payload || !token) throw lastError;

    const fid = Number(payload.sub);
    if (!Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json({ error: "Invalid Farcaster user" }, { status: 401 });
    }
    return createSession(db, farcasterAddress(fid));
  } catch (err) {
    console.warn("[auth/farcaster] SIWF sign-in failed", { domains, error: err });
    return NextResponse.json({ error: "Invalid Farcaster signature" }, { status: 401 });
  }
}

export async function linkWalletToFarcasterSession(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { user, db } = auth;
  if (!isFarcasterAddress(user.address)) {
    return NextResponse.json({ error: "Wallet linking requires a Farcaster session" }, { status: 403 });
  }

  const { message, signature } = await req.json();
  if (typeof message !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "SIWE message and signature are required" }, { status: 400 });
  }

  const siweMessage = new SiweMessage(message);
  const nonce = String(siweMessage.nonce || "");
  if (!(await consumeNonce(db, nonce))) {
    return NextResponse.json({ error: "Nonce is invalid or expired" }, { status: 401 });
  }

  const domain = req.headers.get("host") || undefined;
  const { success, data } = await siweMessage.verify({ signature, nonce, domain });
  if (!success || !data.address) {
    return NextResponse.json({ error: "Invalid wallet signature" }, { status: 401 });
  }

  const walletAddress = data.address.toLowerCase();
  if (!isEvmAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const chainId = Number.isFinite(Number(data.chainId)) ? Number(data.chainId) : null;
  const linkId = `${user.address}:${walletAddress}`;
  await db`INSERT INTO users (address, role) VALUES (${walletAddress}, 'user')
    ON CONFLICT (address) DO NOTHING`;
  await db`
    INSERT INTO linked_wallets (id, farcaster_address, wallet_address, chain_id, verified_at, updated_at)
    VALUES (${linkId}, ${user.address}, ${walletAddress}, ${chainId}, NOW(), NOW())
    ON CONFLICT (farcaster_address, wallet_address)
    DO UPDATE SET chain_id = ${chainId}, verified_at = NOW(), updated_at = NOW()
  `;
  await db`UPDATE auth_nonces SET consumed_at = NOW(), address = ${walletAddress} WHERE nonce = ${nonce}`;
  authLogger("wallet_linked", user.address, { wallet_address: walletAddress, chain_id: chainId });
  return NextResponse.json({ walletAddress, chainId, linked: true });
}

export async function listLinkedWallets(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const rows = await auth.db`
    SELECT wallet_address, chain_id, verified_at, created_at
    FROM linked_wallets
    WHERE farcaster_address = ${auth.user.address}
    ORDER BY verified_at DESC
  ` as Record<string, unknown>[];
  return NextResponse.json({
    data: rows.map((row) => ({
      walletAddress: String(row.wallet_address),
      chainId: row.chain_id === null ? null : Number(row.chain_id),
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    })),
  });
}

export async function unlinkWalletFromFarcasterSession(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { walletAddress } = await req.json();
  if (!isEvmAddress(walletAddress)) {
    return NextResponse.json({ error: "Valid walletAddress is required" }, { status: 400 });
  }
  await auth.db`
    DELETE FROM linked_wallets
    WHERE farcaster_address = ${auth.user.address} AND wallet_address = ${walletAddress.toLowerCase()}
  `;
  return NextResponse.json({ ok: true });
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
    SELECT s.address, u.status, u.role AS stored_role
    FROM sessions s
    JOIN users u ON u.address = s.address
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const address = String(rows[0].address || "").toLowerCase();
  const status = String(rows[0].status || "active") as AuthUser["status"];
  if (status === "banned") {
    await db`DELETE FROM sessions WHERE id = ${sessionId}`;
    return null;
  }
  const role = !isFarcasterAddress(address) && await isOnchainAdmin(address) ? "admin" : "user";
  const fid = isFarcasterAddress(address) ? Number(address.replace("farcaster:", "")) : undefined;
  let linkedWallets: string[] | undefined;
  if (isFarcasterAddress(address)) {
    const linkedRows = await db`
      SELECT wallet_address FROM linked_wallets WHERE farcaster_address = ${address}
    ` as Record<string, unknown>[];
    linkedWallets = linkedRows.map((row) => String(row.wallet_address).toLowerCase());
  }
  return { address, role, status, fid: Number.isFinite(fid) ? fid : undefined, linkedWallets };
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
  if (user.status === "frozen" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return { response: NextResponse.json({ error: "Account is frozen" }, { status: 403 }) };
  }
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
