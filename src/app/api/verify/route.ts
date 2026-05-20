import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { assertSafeUrl } from "@/lib/ssrf";
import { requireUser, type AuthUser } from "@/lib/auth";
import type { DbClient } from "@/lib/api";

/**
 * GET /api/verify?type=dns&domain=example.com&code=ABCD1234
 * GET /api/verify?type=x&handle=@user&tweetUrl=https://x.com/user/status/123
 * GET /api/verify?type=farcaster&fid=12345&address=0x...
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const params = req.nextUrl.searchParams;
  const type = params.get("type");

  switch (type) {
    case "dns": return verifyDns(params, auth.db, auth.user);
    case "x": return verifyX(params, auth.db, auth.user);
    case "farcaster": return verifyFarcaster(params, auth.db, auth.user);
    default:
      return NextResponse.json({ error: "Unknown type. Use dns, x, or farcaster." }, { status: 400 });
  }
}

async function recordAttempt(db: DbClient, user: AuthUser, method: string, target: string, verified: boolean, result: Record<string, unknown>) {
  const attemptId = `VA-${Date.now()}`;
  const verificationRows = await db`
    SELECT id, listing_id FROM verifications
    WHERE owner_address = ${user.address} AND method IN (${method}, ${method.replace("_", "-")}) AND target = ${target}
    ORDER BY created_at DESC
    LIMIT 1
  ` as Record<string, unknown>[];
  const verificationId = verificationRows[0]?.id ? String(verificationRows[0].id) : null;
  const listingId = verificationRows[0]?.listing_id ? String(verificationRows[0].listing_id) : null;
  await db`INSERT INTO verification_attempts (id, verification_id, listing_id, owner_address, method, target, status, result)
    VALUES (${attemptId}, ${verificationId}, ${listingId}, ${user.address}, ${method}, ${target}, ${verified ? "approved" : "failed"}, ${JSON.stringify(result)})`;
  if (verificationId) {
    await db`UPDATE verifications SET status = ${verified ? "approved" : "pending"}, checks = ${JSON.stringify([result])}, updated_at = NOW() WHERE id = ${verificationId}`;
  }
  if (verified && listingId) {
    await db`UPDATE listings SET collateral_data = COALESCE(collateral_data, '{}'::jsonb) || '{"verified": true}'::jsonb, updated_at = NOW() WHERE id = ${listingId}`;
  }
}

// ── DNS TXT verification ────────────────────────────────────

async function verifyDns(params: URLSearchParams, db: DbClient, user: AuthUser) {
  const domain = params.get("domain");
  const code = params.get("code");

  if (!domain || !code) {
    return NextResponse.json({ verified: false, reason: "domain and code are required" });
  }

  let cleanDomain = domain;
  try {
    cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "");

    const records = await dns.resolveTxt(cleanDomain);

    // Flatten nested arrays and search for vault-verify=CODE
    const allRecords = records.flatMap((r) => r.flatMap((s) => s.split(/[;\s]+/).filter(Boolean)));
    const found = allRecords.some((r) => {
      const match = r.match(/^vault-verify[=:]\s*(.+)$/i);
      return match && match[1].trim().toUpperCase() === code.toUpperCase();
    });

    const result = {
      verified: found,
      domain: cleanDomain,
      recordsCount: allRecords.length,
    };
    await recordAttempt(db, user, "dns", cleanDomain, found, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "DNS lookup failed";
    const result = { verified: false, reason: message, domain: cleanDomain };
    await recordAttempt(db, user, "dns", cleanDomain, false, result);
    return NextResponse.json(result);
  }
}

// ── X tweet verification ────────────────────────────────────

async function verifyX(params: URLSearchParams, db: DbClient, user: AuthUser) {
  const handle = params.get("handle")?.replace(/^@/, "").toLowerCase();
  const tweetUrl = params.get("tweetUrl");

  if (!handle || !tweetUrl) {
    return NextResponse.json({ verified: false, reason: "handle and tweetUrl are required" });
  }

  // Parse the handle from the tweet URL
  try {
    const url = new URL(tweetUrl);
    // Only allow x.com / twitter.com
    if (!["x.com", "twitter.com"].includes(url.hostname.replace("www.", ""))) {
      return NextResponse.json({ verified: false, reason: "URL must be from x.com or twitter.com" });
    }
    const pathParts = url.pathname.split("/").filter(Boolean);
    const tweetAuthor = pathParts[0]?.toLowerCase();

    if (!tweetAuthor) {
      return NextResponse.json({ verified: false, reason: "Could not extract author from tweet URL" });
    }

    if (tweetAuthor !== handle) {
      return NextResponse.json({
        verified: false,
        reason: `Tweet author @${tweetAuthor} does not match listed handle @${handle}`,
      });
    }

    // Verify the tweet actually exists by fetching the page
    await assertSafeUrl(tweetUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(tweetUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "VaultBot/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok && res.status !== 200) {
      return NextResponse.json({ verified: false, reason: `Tweet not accessible (HTTP ${res.status})` });
    }

    const html = await res.text();

    // Check if the page contains the verification code pattern
    const code = params.get("code") || "";
    const codeFound = !code || html.toLowerCase().includes(code.toLowerCase());

    const result = {
      verified: codeFound,
      handle: `@${handle}`,
      tweetUrl,
    };
    await recordAttempt(db, user, "x_tweet", `@${handle}`, codeFound, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError"
      ? "Request timed out"
      : "Could not verify tweet";
    const result = { verified: false, reason: message };
    await recordAttempt(db, user, "x_tweet", `@${handle || ""}`, false, result);
    return NextResponse.json(result);
  }
}

// ── Farcaster FID verification ──────────────────────────────

async function verifyFarcaster(params: URLSearchParams, db: DbClient, user: AuthUser) {
  const fid = params.get("fid");
  const address = params.get("address");

  if (!fid || !address) {
    return NextResponse.json({ verified: false, reason: "fid and address are required" });
  }

  try {
    // Query Farcaster IdRegistry on Optimism (contract: 0x00000000Fc6c5F01Fc30151999387Bb99A9f489b)
    const registryAddr = "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b";
    const optimismRpc = "https://mainnet.optimism.io";

    // Call idOf(address) to get the FID owned by the address
    const idOfData = encodeFunctionCall("idOf", ["address"], [address]);
    const idOfRes = await fetch(optimismRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", method: "eth_call",
        params: [{ to: registryAddr, data: idOfData }, "latest"],
        id: 1,
      }),
    });
    const idOfJson = await idOfRes.json();
    const ownedFid = idOfJson.result ? parseInt(idOfJson.result, 16) : null;

    // Also call custodyOf(fid) to get the custody address
    const custodyData = encodeFunctionCall("custodyOf", ["uint256"], [fid]);
    const custodyRes = await fetch(optimismRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", method: "eth_call",
        params: [{ to: registryAddr, data: custodyData }, "latest"],
        id: 2,
      }),
    });
    const custodyJson = await custodyRes.json();
    const custodyAddr = custodyJson.result
      ? "0x" + custodyJson.result.slice(-40)
      : null;

    const addrLower = address.toLowerCase();
    const custodyMatch = custodyAddr?.toLowerCase() === addrLower;
    const idMatch = ownedFid === parseInt(fid);

    const result = {
      verified: custodyMatch || idMatch,
      fid: parseInt(fid),
      address: addrLower,
      custodyAddress: custodyAddr,
      ownedFid,
      custodyMatch,
      idMatch,
    };
    await recordAttempt(db, user, "farcaster_registry", fid, custodyMatch || idMatch, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "On-chain verification failed";
    const result = { verified: false, reason: message };
    await recordAttempt(db, user, "farcaster_registry", fid || "", false, result);
    return NextResponse.json(result);
  }
}

// ── Helpers ─────────────────────────────────────────────────

function encodeFunctionCall(name: string, types: string[], args: string[]): string {
  // simple keccak256 + abi encode for known signatures
  const signatures: Record<string, string> = {
    "idOf(address)": "0x1b5b72cf",
    "custodyOf(uint256)": "0x7a8c80bd",
  };
  const sig = signatures[`${name}(${types.join(",")})`] || "";
  if (!sig) return "0x";

  if (name === "idOf") {
    // address padded to 32 bytes
    return sig + args[0].toLowerCase().replace("0x", "").padStart(64, "0");
  }
  if (name === "custodyOf") {
    // uint256 padded to 32 bytes
    return sig + parseInt(args[0]).toString(16).padStart(64, "0");
  }
  return "0x";
}
