import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { keccak256, toHex, encodeAbiParameters, parseAbiParameters } from "viem";
import { asNumber, badRequest, jsonArray, jsonRecord, type DbClient } from "@/lib/api";
import { actorAddressForRequest, requireAdmin, requireUser, rotateSession } from "@/lib/auth";
import { writeAudit } from "@/lib/admin";
import { getEscrowAddress, getPublicClient } from "@/lib/contract";
import { verifyClankerRightsTransferred } from "@/lib/clanker";

export const proofSchema = z.object({
  proofType: z.enum(["transfer", "delivery", "evidence", "other"]).default("evidence"),
  url: z.string().url(),
  contentHash: z.string().min(8),
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  note: z.string().max(1000).optional(),
});

const actionSchema = z.object({
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  note: z.string().max(1000).optional(),
});

function isContractBacked(row: Record<string, unknown>) {
  return Boolean(row.contract_listing_id || row.contract_address || String(row.tx_status || "") === "pending" || String(row.tx_status || "") === "confirmed");
}

async function requireConfirmedEscrowTx(row: Record<string, unknown>, txHash: string | undefined) {
  if (!isContractBacked(row)) return null;
  if (!txHash) return NextResponse.json({ error: "A confirmed escrow contract transaction hash is required for this action." }, { status: 400 });

  const receipt = await getPublicClient().getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
  if (!receipt) {
    return NextResponse.json({ error: "Escrow contract transaction is not confirmed yet." }, { status: 400 });
  }
  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Escrow contract transaction failed." }, { status: 400 });
  }

  const expected = getEscrowAddress().toLowerCase();
  if (receipt.to?.toLowerCase() !== expected) {
    return NextResponse.json({ error: "Transaction was not sent to the configured escrow contract." }, { status: 400 });
  }

  return null;
}

async function requireConfirmedChainTx(txHash: string | undefined) {
  if (!txHash) return NextResponse.json({ error: "A confirmed transfer transaction hash is required." }, { status: 400 });

  const receipt = await getPublicClient().getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
  if (!receipt) {
    return NextResponse.json({ error: "Transfer transaction is not confirmed yet." }, { status: 400 });
  }
  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Transfer transaction failed." }, { status: 400 });
  }

  return null;
}

async function requireClankerTransferVerified(row: Record<string, unknown>, db: DbClient) {
  const marketplace = String(row.marketplace || "");

  const checks: Array<{
    tokenAddress: string;
    buyerAddress: string;
    chainId: number;
    saleRights: string[];
    remainingSupply: number;
    vaultedAmount: number;
  }> = [];

  if (marketplace === "clanker") {
    const collateral = jsonRecord(row.collateral_data);
    checks.push({
      tokenAddress: String(collateral.tokenAddress || collateral.contractAddress || ""),
      buyerAddress: String(row.buyer_address || ""),
      chainId: asNumber(row.chain_id, 8453),
      saleRights: jsonArray(collateral.saleRights).map(String),
      remainingSupply: asNumber(collateral.remainingSupply),
      vaultedAmount: asNumber(collateral.vaultedAmount),
    });
  } else if (marketplace === "bundle" && String(row.listing_id || "")) {
    const assets = await db`SELECT * FROM listing_assets WHERE listing_id = ${String(row.listing_id)} AND asset_type = 'clanker' ORDER BY position` as Record<string, unknown>[];
    for (const asset of assets) {
      const ad = typeof asset.asset_data === "string" ? JSON.parse(asset.asset_data) : (asset.asset_data as Record<string, unknown>);
      if (ad) {
        checks.push({
          tokenAddress: String(ad.tokenAddress || ad.contractAddress || ""),
          buyerAddress: String(row.buyer_address || ""),
          chainId: asNumber(ad.chainId as unknown, 8453),
          saleRights: jsonArray(ad.saleRights).map(String),
          remainingSupply: asNumber(ad.remainingSupply as unknown),
          vaultedAmount: asNumber(ad.vaultedAmount as unknown),
        });
      }
    }
  }

  if (checks.length === 0) return null;

  for (const check of checks) {
    const result = await verifyClankerRightsTransferred(check);
    if (result.verified) continue;
    return NextResponse.json({
      error: result.reason || "Clanker rights for one or more assets have not been fully transferred.",
      checks: result.checks,
      token: check.tokenAddress,
    }, { status: 400 });
  }

  return null;
}

export async function addEscrowProof(req: NextRequest, escrowId: string) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const parsed = proofSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid proof", parsed.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress);

  const rows = await auth.db`
    SELECT e.*, l.marketplace, l.collateral_data
    FROM escrows e
    LEFT JOIN listings l ON l.id = e.listing_id
    WHERE e.id = ${escrowId} AND (e.buyer_address = ${actorAddress} OR e.seller_address = ${actorAddress})
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found for this session" }, { status: 404 });
  const isClanker = String(rows[0].marketplace || "") === "clanker";
  if (isClanker && parsed.data.proofType !== "transfer") {
    return NextResponse.json({ error: "Clanker token transfers require proofType 'transfer' with a valid txHash." }, { status: 400 });
  }
  const invalidTx = isClanker
    ? await requireConfirmedChainTx(parsed.data.txHash)
    : await requireConfirmedEscrowTx(rows[0], parsed.data.txHash);
  if (invalidTx) return invalidTx;

  const id = `P-${Date.now()}`;
  await auth.db`INSERT INTO escrow_proofs (id, escrow_id, actor_address, proof_type, url, content_hash, note)
    VALUES (${id}, ${escrowId}, ${actorAddress}, ${parsed.data.proofType}, ${parsed.data.url}, ${parsed.data.contentHash}, ${parsed.data.note || null})`;
  await auth.db`UPDATE escrows SET stage = 'asset_transferred', tx_hash = COALESCE(${parsed.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${parsed.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${escrowId} AND stage IN ('funds_locked', 'asset_transferred')`;
  return NextResponse.json({ data: { id, escrowId, ...parsed.data } }, { status: 201 });
}

export async function confirmEscrow(req: NextRequest, escrowId: string) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const body = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return badRequest("Invalid confirmation", body.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, body.data.actorAddress);

  const rows = await auth.db`SELECT * FROM escrows WHERE id = ${escrowId} AND buyer_address = ${actorAddress} LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Only the buyer can confirm this escrow" }, { status: 403 });
  await auth.db`UPDATE escrows SET stage = 'awaiting_confirmation', tx_hash = COALESCE(${body.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${body.data.txHash || null} IS NULL THEN tx_status ELSE 'pending' END, updated_at = NOW() WHERE id = ${escrowId}`;
  return NextResponse.json({ data: { id: escrowId, stage: "awaiting_confirmation" } });
}

export async function releaseEscrow(req: NextRequest, escrowId: string) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const body = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return badRequest("Invalid release", body.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, body.data.actorAddress);

  const rows = await auth.db`
    SELECT e.*, l.marketplace, l.collateral_data
    FROM escrows e
    LEFT JOIN listings l ON l.id = e.listing_id
    WHERE e.id = ${escrowId} AND e.buyer_address = ${actorAddress}
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Only the buyer can release this escrow" }, { status: 403 });
  const invalidTx = await requireConfirmedEscrowTx(rows[0], body.data.txHash);
  if (invalidTx) return invalidTx;
  const invalidClankerTransfer = await requireClankerTransferVerified(rows[0], auth.db);
  if (invalidClankerTransfer) return invalidClankerTransfer;
  const invalidFarcaster = await verifyFarcasterCustody(rows[0]);
  if (invalidFarcaster) return invalidFarcaster;
  await auth.db`UPDATE escrows SET stage = 'released', tx_hash = COALESCE(${body.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${body.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${escrowId}`;
  await auth.db`INSERT INTO transactions (id, escrow_id, from_address, to_address, amount, currency, tx_type, tx_hash, status)
    SELECT ${`T-${Date.now()}`}, id, buyer_address, seller_address, amount, currency, 'escrow_released', ${body.data.txHash || null}, ${body.data.txHash ? "confirmed" : "offchain"} FROM escrows WHERE id = ${escrowId}`;
  const res = NextResponse.json({ data: { id: escrowId, stage: "released" } });
  const rotated = await rotateSession(req, auth.user);
  if (rotated) {
    const setCookie = rotated.headers.getSetCookie();
    for (const cookie of setCookie) res.headers.append("Set-Cookie", cookie);
  }
  return res;
}

export async function refundEscrow(req: NextRequest, escrowId: string) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const body = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return badRequest("Invalid refund", body.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, body.data.actorAddress);

  const rows = await auth.db`SELECT * FROM escrows WHERE id = ${escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found for this session" }, { status: 404 });
  const invalidTx = await requireConfirmedEscrowTx(rows[0], body.data.txHash);
  if (invalidTx) return invalidTx;
  await auth.db`UPDATE escrows SET stage = 'refunded', tx_hash = COALESCE(${body.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${body.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${escrowId}`;
  return NextResponse.json({ data: { id: escrowId, stage: "refunded" } });
}

export async function disputeEscrow(req: NextRequest, escrowId: string) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const body = z.object({
    reason: z.string().min(10).max(500),
    actorAddress: z.string().startsWith("0x").length(42).optional(),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  }).safeParse(await req.json());
  if (!body.success) return badRequest("Invalid dispute", body.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, body.data.actorAddress);

  const rows = await auth.db`SELECT * FROM escrows WHERE id = ${escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found for this session" }, { status: 404 });
  const invalidTx = await requireConfirmedEscrowTx(rows[0], body.data.txHash);
  if (invalidTx) return invalidTx;
  const escrow = rows[0];
  const against = String(escrow.buyer_address).toLowerCase() === actorAddress ? String(escrow.seller_address) : String(escrow.buyer_address);
  const disputeId = `D-${Date.now()}`;
  await auth.db`INSERT INTO disputes (id, escrow_id, filer_address, against_address, reason, status, priority)
    VALUES (${disputeId}, ${escrowId}, ${actorAddress}, ${against}, ${body.data.reason}, 'open', 'medium')`;
  await auth.db`UPDATE escrows SET stage = 'disputed', updated_at = NOW() WHERE id = ${escrowId}`;
  return NextResponse.json({ data: { id: disputeId, escrowId, status: "open" } }, { status: 201 });
}

export async function resolveDispute(req: NextRequest, disputeId: string) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const parsed = z.object({
    verdict: z.enum(["release", "refund", "split"]),
    buyerAmount: z.number().nonnegative().default(0),
    sellerAmount: z.number().nonnegative().default(0),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    note: z.string().max(1000).optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid resolution", parsed.error.flatten());

  const rows = await auth.db`SELECT * FROM disputes WHERE id = ${disputeId} LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  const escrowRows = await auth.db`SELECT * FROM escrows WHERE id = ${rows[0].escrow_id} LIMIT 1` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Escrow not found for this dispute" }, { status: 404 });
  const invalidTx = await requireConfirmedEscrowTx(escrowRows[0], parsed.data.txHash);
  if (invalidTx) return invalidTx;
  const stage = parsed.data.verdict === "refund" ? "refunded" : "released";
  await auth.db`UPDATE disputes SET status = 'resolved', resolution = ${JSON.stringify(parsed.data)}, resolved_at = NOW() WHERE id = ${disputeId}`;
  await auth.db`UPDATE escrows SET stage = ${stage}, tx_hash = COALESCE(${parsed.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${parsed.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${rows[0].escrow_id}`;
  await writeAudit("DISPUTE_RESOLVED", disputeId, parsed.data.note || `Verdict: ${parsed.data.verdict}`, "admin", auth.user.address, parsed.data.txHash);
  const res = NextResponse.json({ data: { id: disputeId, status: "resolved", verdict: parsed.data.verdict } });
  const rotated = await rotateSession(req, auth.user);
  if (rotated) {
    const setCookie = rotated.headers.getSetCookie();
    for (const cookie of setCookie) res.headers.append("Set-Cookie", cookie);
  }
  return res;
}

async function verifyFarcasterCustody(row: Record<string, unknown>) {
  const marketplace = String(row.marketplace || "");
  if (marketplace !== "farcaster") return null;

  const collateral = jsonRecord(row.collateral_data);
  const fid = String(collateral.fid || "");
  const buyerAddress = String(row.buyer_address || "");
  if (!fid || !buyerAddress) return null;

  try {
    const registryAddr = "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b";
    const rpc = "https://mainnet.optimism.io";

    // Check custodyOf(fid) matches buyer address
    const custodyData = encodeFunctionCall("custodyOf", ["uint256"], [fid]);
    const custodyRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: registryAddr, data: custodyData }, "latest"], id: 1 }),
    });
    const custodyJson = await custodyRes.json();
    const custodyAddr = custodyJson.result ? "0x" + custodyJson.result.slice(-40) : null;

    const buyerLower = buyerAddress.toLowerCase();
    if (custodyAddr?.toLowerCase() === buyerLower) return null;

    return NextResponse.json({
      error: `Farcaster FID #${fid} custody has not transferred to buyer ${buyerAddress.slice(0, 10)}.... Current custody: ${custodyAddr || "unknown"}.`,
      detail: "The FID's custody address must match the buyer before funds can be released.",
    }, { status: 400 });
  } catch {
    return NextResponse.json({
      error: "Unable to verify Farcaster FID custody on-chain. The Optimism RPC may be unavailable.",
    }, { status: 502 });
  }
}

function encodeFunctionCall(name: string, types: string[], args: string[]): `0x${string}` {
  const sig = `${name}(${types.join(",")})`;
  const selector = keccak256(toHex(sig)).slice(0, 10);
  const encoded = encodeAbiParameters(parseAbiParameters(types.join(",")), args);
  return (selector + encoded.slice(2)) as `0x${string}`;
}
