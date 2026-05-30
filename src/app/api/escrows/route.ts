import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, relativeDeadline, shortAddress, stageLabel } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const escrowSchema = z.object({
  listingId: z.string().min(1).optional(),
  buyerAddress: z.string().startsWith("0x").min(10).optional(),
  sellerAddress: z.string().startsWith("0x").min(10),
  amount: z.number().positive(),
  currency: z.string().min(1).default("ETH"),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = auth.user.role === "admin"
    ? await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id ORDER BY e.created_at DESC` as Record<string, unknown>[]
    : await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.buyer_address = ${auth.user.address} OR e.seller_address = ${auth.user.address} ORDER BY e.created_at DESC` as Record<string, unknown>[];
  const data = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
    party: shortAddress(r.buyer_address),
    asset: r.title || r.listing_id || "Unlisted asset",
    amount: Number(r.amount),
    asset_type: r.currency || "ETH",
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
  const id = `E-${Date.now()}`;
  await db`INSERT INTO users (address) VALUES (${auth.user.address}) ON CONFLICT (address) DO NOTHING`;
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

      for (const asset of assets) {
        const ad = typeof asset.asset_data === "string" ? JSON.parse(asset.asset_data) : asset.asset_data as Record<string, unknown>;
        const target = String(ad.label || ad.handle || ad.name || asset.id);
        const method =
          String(asset.asset_type) === "x_account" ? "x_tweet" :
          String(asset.asset_type) === "farcaster" ? "farcaster_registry" :
          String(asset.asset_type) === "clanker" ? "token_ownership" :
          String(asset.asset_type) === "mini_app" ? "dns" :
          "nft_ownership";

        const existing = await db`SELECT id FROM verifications WHERE listing_id = ${data.listingId} AND marketplace = ${String(asset.asset_type)} AND target = ${target} LIMIT 1` as Record<string, unknown>[];
        if (existing.length === 0) {
          await db`INSERT INTO verifications (id, listing_id, marketplace, target, owner_address, method, status, checks)
            VALUES (${`V-${Date.now()}-${asset.id}`}, ${data.listingId}, ${String(asset.asset_type)}, ${target}, ${data.sellerAddress}, ${method}, 'pending', ${JSON.stringify([])})`;
        }
      }
    }
  }

  const deliverablesJson = deliverables.length > 0 ? JSON.stringify(deliverables) : null;

  await db`INSERT INTO escrows (id, listing_id, buyer_address, seller_address, amount, currency, stage, chain_id, contract_address, contract_listing_id, tx_hash, tx_status, deliverables)
    VALUES (${id}, ${data.listingId || null}, ${auth.user.address}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'funds_locked', ${data.chainId || null}, ${data.contractAddress || null}, ${data.contractListingId || null}, ${data.txHash || null}, ${data.txHash ? "pending" : "offchain"}, ${deliverablesJson})`;
  await db`INSERT INTO transactions (id, escrow_id, listing_id, from_address, to_address, amount, currency, tx_type, tx_hash, chain_id, status)
    VALUES (${`T-${Date.now()}`}, ${id}, ${data.listingId || null}, ${auth.user.address}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'escrow_funded', ${data.txHash || null}, ${data.chainId || null}, ${data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id } }, { status: 201 });
}
