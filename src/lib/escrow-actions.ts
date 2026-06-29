import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { actorAddressForRequest, requireAdmin, requireUser, rotateSession } from "@/lib/auth";
import { writeAudit } from "@/lib/admin";
import { getEscrowAddress, getPublicClient } from "@/lib/contract";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

function triggerStageChange(escrowId: string, stage: string) {
  pusher.trigger(`private-deal-${escrowId}`, "stage-change", { stage }).catch(() => {});
}

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
  if (parsed.data.txHash) {
    const invalidTx = await requireConfirmedChainTx(parsed.data.txHash);
    if (invalidTx) return invalidTx;
  }

  const id = `P-${Date.now()}`;
  await auth.db`INSERT INTO escrow_proofs (id, escrow_id, actor_address, proof_type, url, content_hash, note)
    VALUES (${id}, ${escrowId}, ${actorAddress}, ${parsed.data.proofType}, ${parsed.data.url}, ${parsed.data.contentHash}, ${parsed.data.note || null})`;
  await auth.db`UPDATE escrows SET stage = 'asset_transferred', tx_hash = COALESCE(${parsed.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${parsed.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${escrowId} AND stage IN ('pending_payment', 'paid', 'funds_locked', 'asset_transferred')`;
  triggerStageChange(escrowId, "asset_transferred");
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
  triggerStageChange(escrowId, "awaiting_confirmation");
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
  await auth.db`UPDATE escrows SET stage = 'released', tx_hash = COALESCE(${body.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${body.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END, updated_at = NOW() WHERE id = ${escrowId}`;
  triggerStageChange(escrowId, "released");
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
  triggerStageChange(escrowId, "refunded");
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
