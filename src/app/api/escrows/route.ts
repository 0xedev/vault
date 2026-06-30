import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, relativeDeadline, shortAddress, stageLabel } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { copyListingMessagesToDeal } from "@/lib/listing-messages";

const escrowSchema = z.object({
  listingId: z.string().min(1).optional(),
  buyerAddress: z.string().startsWith("0x").min(10).optional(),
  sellerAddress: z.string().startsWith("0x").min(10),
  amount: z.number().positive(),
  currency: z.string().min(1).default("USDC"),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));

  const rows = auth.user.role === "admin"
    ? await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id ORDER BY e.created_at DESC` as Record<string, unknown>[]
    : await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.buyer_address = ${actorAddress} OR e.seller_address = ${actorAddress} ORDER BY e.created_at DESC` as Record<string, unknown>[];
  const data = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
    party: shortAddress(r.buyer_address),
    asset: r.title || r.listing_id || "Unlisted asset",
    amount: Number(r.amount),
    asset_type: r.currency || "USDC",
    deadline: relativeDeadline(r.deadline),
    stage: stageLabel(r.stage),
    action: String(r.stage) === "funds_locked" ? "Awaiting seller" : String(r.stage) === "awaiting_confirmation" ? "Awaiting confirmation" : "On schedule",
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  const body = await req.json();
  const parsed = escrowSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid escrow", parsed.error.flatten());

  const data = parsed.data;
  const buyerAddress = actorAddressForRequest(auth.user, data.buyerAddress);
  if (buyerAddress.toLowerCase() === data.sellerAddress.toLowerCase()) {
    return NextResponse.json({ error: "Buyer and seller must be different addresses" }, { status: 400 });
  }
  const id = `E-${Date.now()}`;
  await db`INSERT INTO users (address) VALUES (${buyerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO users (address) VALUES (${data.sellerAddress}) ON CONFLICT (address) DO NOTHING`;

  let deliverables: string[] = [];

  if (data.listingId) {
    const listingRows = await db`SELECT * FROM listings WHERE id = ${data.listingId} LIMIT 1` as Record<string, unknown>[];
    if (listingRows.length > 0 && String(listingRows[0].is_bundle) === "true") {
      const assets = await db`SELECT * FROM listing_assets WHERE listing_id = ${data.listingId} ORDER BY position` as Record<string, unknown>[];
      deliverables = assets.map((a) => {
        const ad = typeof a.asset_data === "string" ? JSON.parse(a.asset_data) : a.asset_data as Record<string, unknown>;
        return `[${String(a.asset_type).replace(/_/g, " ")}] ${String(ad.label || ad.handle || ad.name || "Item")}`;
      });

    }
  }

  const deliverablesJson = deliverables.length > 0 ? JSON.stringify(deliverables) : null;

  await db`INSERT INTO escrows (id, listing_id, buyer_address, seller_address, amount, currency, stage, chain_id, contract_address, contract_listing_id, tx_hash, tx_status, deliverables)
    VALUES (${id}, ${data.listingId || null}, ${buyerAddress}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'pending_payment', ${data.chainId || null}, ${data.contractAddress || null}, ${data.contractListingId || null}, ${data.txHash || null}, ${data.txHash ? "pending" : "offchain"}, ${deliverablesJson})`;
  await db`INSERT INTO transactions (id, escrow_id, listing_id, from_address, to_address, amount, currency, tx_type, tx_hash, chain_id, status)
    VALUES (${`T-${Date.now()}`}, ${id}, ${data.listingId || null}, ${buyerAddress}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'escrow_funded', ${data.txHash || null}, ${data.chainId || null}, ${data.txHash ? "pending" : "offchain"})`;

  await copyListingMessagesToDeal({
    db,
    listingId: data.listingId,
    buyerAddress,
    escrowId: id,
  });

  return NextResponse.json({ data: { id } }, { status: 201 });
}
